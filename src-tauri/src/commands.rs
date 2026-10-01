use serde::Serialize;
use tauri::{AppHandle, State};

use crate::auth::{self, REDIRECT_URI};
use crate::error::Result;
use crate::scheduler;
use crate::spotify::{self, Profile};
use crate::state::{AppState, Schedule, SpotifyItem};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifyStatus {
    client_id: Option<String>,
    redirect_uri: &'static str,
    user: Option<Profile>,
    /// Preenchido quando há sessão salva mas o Spotify não respondeu.
    error: Option<String>,
}

#[tauri::command]
pub async fn spotify_status(state: State<'_, AppState>) -> Result<SpotifyStatus> {
    let (client_id, has_tokens) = {
        let data = state.read();
        (data.client_id.clone(), data.tokens.is_some())
    };
    let (user, error) = if has_tokens {
        match spotify::me(&state).await {
            Ok(profile) => (Some(profile), None),
            Err(e) => (None, Some(e.to_string())),
        }
    } else {
        (None, None)
    };
    Ok(SpotifyStatus { client_id, redirect_uri: REDIRECT_URI, user, error })
}

#[tauri::command]
pub fn set_client_id(state: State<'_, AppState>, client_id: String) -> Result<()> {
    let client_id = client_id.trim().to_string();
    state.update(|d| {
        // Tokens pertencem ao Client ID antigo.
        if d.client_id.as_deref() != Some(client_id.as_str()) {
            d.tokens = None;
        }
        d.client_id = (!client_id.is_empty()).then_some(client_id);
    })
}

#[tauri::command]
pub async fn spotify_login(app: AppHandle, state: State<'_, AppState>) -> Result<Profile> {
    auth::login(&app, &state).await
}

#[tauri::command]
pub fn spotify_logout(state: State<'_, AppState>) -> Result<()> {
    state.update(|d| d.tokens = None)
}

#[tauri::command]
pub async fn spotify_search(state: State<'_, AppState>, query: String) -> Result<Vec<SpotifyItem>> {
    spotify::search(&state, &query).await
}

#[tauri::command]
pub fn get_schedules(state: State<'_, AppState>) -> Vec<Schedule> {
    state.read().schedules.clone()
}

#[tauri::command]
pub fn save_schedules(state: State<'_, AppState>, schedules: Vec<Schedule>) -> Result<()> {
    state.update(|d| {
        d.last_fired.retain(|id, _| schedules.iter().any(|s| &s.id == id));
        d.schedules = schedules;
    })
}

#[tauri::command]
pub async fn run_schedule_now(state: State<'_, AppState>, schedule: Schedule) -> Result<String> {
    scheduler::run(&state, &schedule).await
}
