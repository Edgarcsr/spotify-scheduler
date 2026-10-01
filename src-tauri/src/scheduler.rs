use std::time::Duration;

use chrono::{DateTime, Datelike, Local, NaiveTime};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

use crate::error::{Error, Result};
use crate::spotify;
use crate::state::{AppState, Schedule, ScheduleMode};

const TICK: Duration = Duration::from_secs(15);
/// Se o PC acordar da suspensão até 2 min depois do horário, ainda dispara.
const CATCH_UP_SECS: i64 = 120;
/// Teto de faixas enfileiradas por disparo (uma requisição por faixa).
const MAX_QUEUED: usize = 100;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FiredEvent {
    pub id: String,
    pub name: String,
    pub ok: bool,
    pub message: String,
}

pub fn spawn(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(TICK);
        loop {
            interval.tick().await;
            tick(&app).await;
        }
    });
}

/// Chave do disparo de hoje se o agendamento estiver dentro da janela, senão None.
fn due_key(schedule: &Schedule, now: DateTime<Local>) -> Option<String> {
    if !schedule.enabled {
        return None;
    }
    let weekday = now.weekday().num_days_from_sunday() as u8;
    if !schedule.days.contains(&weekday) {
        return None;
    }
    let time = NaiveTime::parse_from_str(&schedule.time, "%H:%M").ok()?;
    let elapsed = (now.time() - time).num_seconds();
    (0..CATCH_UP_SECS)
        .contains(&elapsed)
        .then(|| format!("{} {}", now.format("%Y-%m-%d"), schedule.time))
}

async fn tick(app: &AppHandle) {
    let state = app.state::<AppState>();
    let now = Local::now();

    let due: Vec<(Schedule, String)> = {
        let data = state.read();
        data.schedules
            .iter()
            .filter_map(|s| due_key(s, now).map(|key| (s.clone(), key)))
            .filter(|(s, key)| data.last_fired.get(&s.id) != Some(key))
            .collect()
    };

    for (schedule, key) in due {
        // Marca antes de executar para nunca disparar duas vezes, mesmo se falhar.
        let _ = state.update(|d| d.last_fired.insert(schedule.id.clone(), key));
        let result = run(&state, &schedule).await;
        notify(app, &schedule, result);
    }
}

/// Executa um agendamento e devolve um resumo do que foi feito.
pub async fn run(state: &AppState, schedule: &Schedule) -> Result<String> {
    let first = schedule
        .items
        .first()
        .ok_or_else(|| Error::msg("Esse agendamento não tem nada para tocar."))?;
    let device = spotify::ensure_device(state).await?;

    match schedule.mode {
        ScheduleMode::Play => {
            spotify::set_shuffle(state, &device, schedule.shuffle).await?;
            spotify::play(state, &device, first).await?;
            Ok(format!("Tocando {}", first.name))
        }
        ScheduleMode::Queue => {
            let mut uris = Vec::new();
            for item in &schedule.items {
                let remaining = MAX_QUEUED - uris.len();
                if remaining == 0 {
                    break;
                }
                uris.extend(spotify::track_uris(state, item, remaining).await?);
            }
            if schedule.shuffle {
                shuffle(&mut uris);
            }
            for uri in &uris {
                spotify::add_to_queue(state, &device, uri).await?;
            }
            Ok(match uris.len() {
                1 => "1 música adicionada à fila".to_string(),
                n => format!("{n} músicas adicionadas à fila"),
            })
        }
    }
}

/// Fisher–Yates com o gerador do sistema.
fn shuffle<T>(items: &mut [T]) {
    for i in (1..items.len()).rev() {
        let mut bytes = [0u8; 8];
        if getrandom::fill(&mut bytes).is_err() {
            return;
        }
        let j = (u64::from_le_bytes(bytes) % (i as u64 + 1)) as usize;
        items.swap(i, j);
    }
}

pub fn notify(app: &AppHandle, schedule: &Schedule, result: Result<String>) {
    let event = FiredEvent {
        id: schedule.id.clone(),
        name: schedule.name.clone(),
        ok: result.is_ok(),
        message: match result {
            Ok(summary) => summary,
            Err(e) => e.to_string(),
        },
    };

    // A janela pode estar escondida na bandeja, então avisa também pelo sistema.
    let title = if event.ok { event.name.clone() } else { format!("{} falhou", event.name) };
    let _ = app.notification().builder().title(title).body(&event.message).show();
    let _ = app.emit("schedule-fired", event);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::{ItemType, SpotifyItem};
    use chrono::TimeZone;

    fn schedule(time: &str, days: Vec<u8>) -> Schedule {
        Schedule {
            id: "a".into(),
            name: "Teste".into(),
            time: time.into(),
            days,
            enabled: true,
            mode: ScheduleMode::Play,
            items: vec![SpotifyItem {
                uri: "spotify:track:x".into(),
                kind: ItemType::Track,
                name: "x".into(),
                subtitle: String::new(),
                image_url: None,
            }],
            shuffle: false,
        }
    }

    // 2026-09-30 é uma quarta-feira (3).
    fn at(h: u32, m: u32, s: u32) -> DateTime<Local> {
        Local.with_ymd_and_hms(2026, 9, 30, h, m, s).unwrap()
    }

    #[test]
    fn dispara_dentro_da_janela() {
        let s = schedule("07:30", vec![3]);
        assert_eq!(due_key(&s, at(7, 30, 0)).as_deref(), Some("2026-09-30 07:30"));
        assert!(due_key(&s, at(7, 31, 59)).is_some());
    }

    #[test]
    fn nao_dispara_fora_da_janela_ou_do_dia() {
        let s = schedule("07:30", vec![3]);
        assert!(due_key(&s, at(7, 29, 59)).is_none());
        assert!(due_key(&s, at(7, 32, 0)).is_none());
        assert!(due_key(&schedule("07:30", vec![1, 2]), at(7, 30, 0)).is_none());

        let mut off = schedule("07:30", vec![3]);
        off.enabled = false;
        assert!(due_key(&off, at(7, 30, 0)).is_none());
    }

    #[test]
    fn shuffle_mantem_os_elementos() {
        let mut v: Vec<u32> = (0..50).collect();
        shuffle(&mut v);
        v.sort();
        assert_eq!(v, (0..50).collect::<Vec<_>>());
    }
}
