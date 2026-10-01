use reqwest::{Method, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::error::{Error, Result};
use crate::state::{AppState, ItemType, SpotifyItem, Tokens};

const API: &str = "https://api.spotify.com/v1";
pub const TOKEN_URL: &str = "https://accounts.spotify.com/api/token";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub display_name: Option<String>,
    pub image_url: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Device {
    pub id: Option<String>,
    pub is_active: bool,
    pub is_restricted: bool,
}

#[derive(Deserialize)]
pub struct TokenResponse {
    access_token: String,
    expires_in: i64,
    refresh_token: Option<String>,
}

impl TokenResponse {
    /// No refresh o Spotify pode omitir o refresh_token; nesse caso mantém o anterior.
    pub fn into_tokens(self, previous_refresh: Option<String>) -> Result<Tokens> {
        let refresh_token = self
            .refresh_token
            .or(previous_refresh)
            .ok_or_else(|| Error::msg("O Spotify não devolveu um refresh token."))?;
        Ok(Tokens {
            access_token: self.access_token,
            refresh_token,
            expires_at: chrono::Utc::now().timestamp() + self.expires_in,
        })
    }
}

fn not_connected() -> Error {
    Error::msg("Conecte sua conta do Spotify primeiro.")
}

/// Access token válido, renovando com o refresh token se estiver perto de expirar.
async fn access_token(state: &AppState) -> Result<String> {
    let (client_id, tokens) = {
        let data = state.read();
        (data.client_id.clone(), data.tokens.clone())
    };
    let tokens = tokens.ok_or_else(not_connected)?;
    if tokens.expires_at - 60 > chrono::Utc::now().timestamp() {
        return Ok(tokens.access_token);
    }

    let client_id = client_id.ok_or_else(not_connected)?;
    let response = state
        .http
        .post(TOKEN_URL)
        .form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", tokens.refresh_token.as_str()),
            ("client_id", client_id.as_str()),
        ])
        .send()
        .await?;

    if !response.status().is_success() {
        // Refresh token revogado ou inválido: força um novo login.
        state.update(|d| d.tokens = None)?;
        return Err(Error::msg("Sua sessão do Spotify expirou. Conecte novamente."));
    }

    let fresh = response
        .json::<TokenResponse>()
        .await?
        .into_tokens(Some(tokens.refresh_token))?;
    let access = fresh.access_token.clone();
    state.update(|d| d.tokens = Some(fresh))?;
    Ok(access)
}

/// `path` pode ser relativo à API (`/me`) ou uma URL completa (paginação via `next`).
async fn request(
    state: &AppState,
    method: Method,
    path: &str,
    query: &[(&str, &str)],
    body: Option<Value>,
) -> Result<Option<Value>> {
    let token = access_token(state).await?;
    let url = if path.starts_with("https://") { path.to_string() } else { format!("{API}{path}") };

    let mut builder = state.http.request(method, url).bearer_auth(token).query(query);
    if let Some(body) = body {
        builder = builder.json(&body);
    } else {
        // PUT/POST sem corpo precisam de Content-Length: 0 para o Spotify não devolver 411.
        builder = builder.header(reqwest::header::CONTENT_LENGTH, 0);
    }

    let response = builder.send().await?;
    let status = response.status();
    let text = response.text().await?;

    if !status.is_success() {
        return Err(api_error(status, &text));
    }
    if text.trim().is_empty() {
        return Ok(None);
    }
    // Alguns endpoints do player devolvem um snapshot id em texto puro.
    Ok(serde_json::from_str(&text).ok())
}

fn api_error(status: StatusCode, body: &str) -> Error {
    let parsed: Value = serde_json::from_str(body).unwrap_or(Value::Null);
    let reason = parsed["error"]["reason"].as_str().unwrap_or_default();
    let message = parsed["error"]["message"].as_str().unwrap_or_default();

    let no_device = reason == "NO_ACTIVE_DEVICE"
        || (status == StatusCode::NOT_FOUND && message.to_lowercase().contains("device"));

    if no_device {
        Error::msg("Nenhum dispositivo do Spotify disponível. Abra o Spotify em algum aparelho.")
    } else if reason == "PREMIUM_REQUIRED" {
        Error::msg("Controlar a reprodução exige Spotify Premium.")
    } else if status == StatusCode::UNAUTHORIZED {
        Error::msg("Sua sessão do Spotify expirou. Conecte novamente.")
    } else if status == StatusCode::TOO_MANY_REQUESTS {
        Error::msg("Muitas requisições ao Spotify. Tente de novo em instantes.")
    } else if !message.is_empty() {
        Error::msg(format!("Spotify: {message} ({})", status.as_u16()))
    } else {
        Error::msg(format!("Spotify respondeu {status}"))
    }
}

async fn get(state: &AppState, path: &str, query: &[(&str, &str)]) -> Result<Value> {
    request(state, Method::GET, path, query, None)
        .await?
        .ok_or_else(|| Error::msg("Resposta vazia do Spotify."))
}

pub async fn me(state: &AppState) -> Result<Profile> {
    let value = get(state, "/me", &[]).await?;
    Ok(Profile {
        id: value["id"].as_str().unwrap_or_default().to_string(),
        display_name: value["display_name"].as_str().map(str::to_string),
        image_url: first_image(&value),
    })
}

// ---------- busca ----------

/// Menor imagem com pelo menos 200px (as capas da grade), ou a primeira se não houver tamanho.
fn first_image(value: &Value) -> Option<String> {
    let images = value["images"].as_array()?;
    images
        .iter()
        .filter(|img| img["width"].as_u64().is_some_and(|w| w >= 200))
        .min_by_key(|img| img["width"].as_u64())
        .or_else(|| images.first())?["url"]
        .as_str()
        .map(str::to_string)
}

fn artist_names(value: &Value) -> String {
    value["artists"]
        .as_array()
        .map(|artists| {
            artists
                .iter()
                .filter_map(|a| a["name"].as_str())
                .collect::<Vec<_>>()
                .join(", ")
        })
        .unwrap_or_default()
}

fn to_item(kind: ItemType, value: &Value) -> Option<SpotifyItem> {
    // A busca às vezes devolve `null` no meio dos resultados.
    let uri = value["uri"].as_str()?.to_string();
    let name = value["name"].as_str()?.to_string();
    let (subtitle, image_url) = match kind {
        ItemType::Playlist => {
            let owner = value["owner"]["display_name"].as_str().unwrap_or("Spotify");
            (format!("Playlist · {owner}"), first_image(value))
        }
        ItemType::Album => (format!("Álbum · {}", artist_names(value)), first_image(value)),
        ItemType::Track => (format!("Música · {}", artist_names(value)), first_image(&value["album"])),
    };
    Some(SpotifyItem { uri, kind, name, subtitle, image_url })
}

fn collect(kind: ItemType, list: &Value) -> Vec<SpotifyItem> {
    list.as_array()
        .map(|items| items.iter().filter_map(|v| to_item(kind, v)).collect())
        .unwrap_or_default()
}

/// Busca vazia lista as playlists do usuário; caso contrário, busca no catálogo.
pub async fn search(state: &AppState, query: &str) -> Result<Vec<SpotifyItem>> {
    let query = query.trim();
    if query.is_empty() {
        let value = get(state, "/me/playlists", &[("limit", "20")]).await?;
        return Ok(collect(ItemType::Playlist, &value["items"]));
    }

    // Em modo de desenvolvimento o limite máximo por tipo é 10.
    let value = get(state, "/search", &[("q", query), ("type", "playlist,album,track"), ("limit", "10")]).await?;
    let mut items = collect(ItemType::Playlist, &value["playlists"]["items"]);
    items.extend(collect(ItemType::Album, &value["albums"]["items"]));
    items.extend(collect(ItemType::Track, &value["tracks"]["items"]));
    Ok(items)
}

// ---------- player ----------

pub async fn devices(state: &AppState) -> Result<Vec<Device>> {
    let value = get(state, "/me/player/devices", &[]).await?;
    Ok(serde_json::from_value(value["devices"].clone()).unwrap_or_default())
}

/// Id do dispositivo ativo; se nenhum estiver ativo, transfere para o primeiro disponível.
pub async fn ensure_device(state: &AppState) -> Result<String> {
    let devices = devices(state).await?;
    if let Some(id) = devices.iter().find(|d| d.is_active).and_then(|d| d.id.clone()) {
        return Ok(id);
    }
    let id = devices
        .iter()
        .find(|d| !d.is_restricted)
        .and_then(|d| d.id.clone())
        .ok_or_else(|| Error::msg("Nenhum dispositivo do Spotify aberto. Abra o app do Spotify no PC ou no celular."))?;

    request(state, Method::PUT, "/me/player", &[], Some(json!({ "device_ids": [id], "play": false }))).await?;
    Ok(id)
}

pub async fn set_shuffle(state: &AppState, device_id: &str, on: bool) -> Result<()> {
    let flag = if on { "true" } else { "false" };
    request(state, Method::PUT, "/me/player/shuffle", &[("state", flag), ("device_id", device_id)], None).await?;
    Ok(())
}

pub async fn play(state: &AppState, device_id: &str, item: &SpotifyItem) -> Result<()> {
    let body = match item.kind {
        ItemType::Track => json!({ "uris": [item.uri] }),
        ItemType::Playlist | ItemType::Album => json!({ "context_uri": item.uri }),
    };
    request(state, Method::PUT, "/me/player/play", &[("device_id", device_id)], Some(body)).await?;
    Ok(())
}

pub async fn add_to_queue(state: &AppState, device_id: &str, uri: &str) -> Result<()> {
    request(state, Method::POST, "/me/player/queue", &[("uri", uri), ("device_id", device_id)], None).await?;
    Ok(())
}

/// URIs das faixas de um item (até `limit`), seguindo a paginação.
pub async fn track_uris(state: &AppState, item: &SpotifyItem, limit: usize) -> Result<Vec<String>> {
    let id = item.uri.rsplit(':').next().unwrap_or_default();
    let mut next = match item.kind {
        ItemType::Track => return Ok(vec![item.uri.clone()]),
        ItemType::Album => format!("{API}/albums/{id}/tracks?limit=50"),
        ItemType::Playlist => format!("{API}/playlists/{id}/items?limit=50"),
    };

    let mut uris = Vec::new();
    while uris.len() < limit {
        let page = get(state, &next, &[]).await.map_err(|e| match item.kind {
            ItemType::Playlist => Error::msg(format!(
                "Não foi possível ler \"{}\". O Spotify só libera as faixas de playlists suas ou colaborativas.",
                item.name
            )),
            _ => e,
        })?;

        for entry in page["items"].as_array().into_iter().flatten() {
            // Faixas de álbum vêm direto; itens de playlist vêm em `item` (antes `track`).
            let track = match item.kind {
                ItemType::Album => entry,
                _ if !entry["item"].is_null() => &entry["item"],
                _ => &entry["track"],
            };
            // Ignora episódios de podcast e faixas locais.
            if let Some(uri) = track["uri"].as_str().filter(|u| u.starts_with("spotify:track:")) {
                uris.push(uri.to_string());
            }
        }

        match page["next"].as_str() {
            Some(url) => next = url.to_string(),
            None => break,
        }
    }

    uris.truncate(limit);
    Ok(uris)
}
