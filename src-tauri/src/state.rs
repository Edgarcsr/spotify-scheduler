use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};

use serde::{Deserialize, Serialize};

use crate::error::Result;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ItemType {
    Playlist,
    Album,
    Track,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifyItem {
    pub uri: String,
    #[serde(rename = "type")]
    pub kind: ItemType,
    pub name: String,
    pub subtitle: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ScheduleMode {
    Play,
    Queue,
}

/// Espelha o tipo `Schedule` de `src/lib/types.ts`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Schedule {
    pub id: String,
    pub name: String,
    /// "HH:MM" no horário local.
    pub time: String,
    /// 0 = domingo … 6 = sábado.
    pub days: Vec<u8>,
    pub enabled: bool,
    pub mode: ScheduleMode,
    pub items: Vec<SpotifyItem>,
    pub shuffle: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tokens {
    pub access_token: String,
    pub refresh_token: String,
    /// Unix timestamp (segundos).
    pub expires_at: i64,
}

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct Persisted {
    pub client_id: Option<String>,
    pub tokens: Option<Tokens>,
    pub schedules: Vec<Schedule>,
    /// id do agendamento → "AAAA-MM-DD HH:MM" do último disparo, para não disparar duas vezes.
    pub last_fired: HashMap<String, String>,
}

pub struct AppState {
    data: Mutex<Persisted>,
    path: PathBuf,
    pub http: reqwest::Client,
}

impl AppState {
    pub fn load(dir: PathBuf) -> Result<Self> {
        std::fs::create_dir_all(&dir)?;
        let path = dir.join("state.json");
        let data = match std::fs::read_to_string(&path) {
            Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Persisted::default(),
            Err(e) => return Err(e.into()),
        };
        Ok(Self {
            data: Mutex::new(data),
            path,
            http: reqwest::Client::new(),
        })
    }

    /// Lê o estado. Nunca segure o guard através de um `.await`.
    pub fn read(&self) -> MutexGuard<'_, Persisted> {
        self.data.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Altera o estado e grava em disco.
    pub fn update<T>(&self, f: impl FnOnce(&mut Persisted) -> T) -> Result<T> {
        let mut data = self.read();
        let result = f(&mut data);
        let tmp = self.path.with_extension("json.tmp");
        std::fs::write(&tmp, serde_json::to_vec_pretty(&*data)?)?;
        std::fs::rename(&tmp, &self.path)?;
        Ok(result)
    }
}
