//! Login com OAuth 2.0 + PKCE. Não precisa de client secret: o app abre o
//! navegador e recebe o código num servidor HTTP temporário em 127.0.0.1.

use std::time::Duration;

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use sha2::{Digest, Sha256};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use url::Url;

use crate::error::{Error, Result};
use crate::spotify::{self, Profile, TokenResponse, TOKEN_URL};
use crate::state::AppState;

pub const REDIRECT_PORT: u16 = 43821;
pub const REDIRECT_URI: &str = "http://127.0.0.1:43821/callback";

const SCOPES: &str = "user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative";
const LOGIN_TIMEOUT: Duration = Duration::from_secs(300);

fn random_string(len: usize) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let mut bytes = vec![0u8; len];
    getrandom::fill(&mut bytes).expect("gerador de números aleatórios do sistema indisponível");
    bytes.iter().map(|b| CHARSET[*b as usize % CHARSET.len()] as char).collect()
}

pub async fn login(app: &AppHandle, state: &AppState) -> Result<Profile> {
    let client_id = state
        .read()
        .client_id
        .clone()
        .ok_or_else(|| Error::msg("Informe o Client ID do seu app do Spotify."))?;

    let verifier = random_string(64);
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let csrf = random_string(16);

    let listener = TcpListener::bind(("127.0.0.1", REDIRECT_PORT)).await.map_err(|_| {
        Error::msg(format!("A porta {REDIRECT_PORT} está em uso. Já existe um login em andamento?"))
    })?;

    let authorize = Url::parse_with_params(
        "https://accounts.spotify.com/authorize",
        &[
            ("client_id", client_id.as_str()),
            ("response_type", "code"),
            ("redirect_uri", REDIRECT_URI),
            ("code_challenge_method", "S256"),
            ("code_challenge", challenge.as_str()),
            ("scope", SCOPES),
            ("state", csrf.as_str()),
        ],
    )
    .expect("URL de autorização válida");

    app.opener()
        .open_url(authorize.as_str(), None::<&str>)
        .map_err(|e| Error::msg(format!("Não consegui abrir o navegador: {e}")))?;

    let code = tokio::time::timeout(LOGIN_TIMEOUT, wait_for_code(&listener, &csrf))
        .await
        .map_err(|_| Error::msg("O login expirou. Tente de novo."))??;

    let response = state
        .http
        .post(TOKEN_URL)
        .form(&[
            ("grant_type", "authorization_code"),
            ("code", code.as_str()),
            ("redirect_uri", REDIRECT_URI),
            ("client_id", client_id.as_str()),
            ("code_verifier", verifier.as_str()),
        ])
        .send()
        .await?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(Error::msg(format!("O Spotify recusou o login: {body}")));
    }

    let tokens = response.json::<TokenResponse>().await?.into_tokens(None)?;
    state.update(|d| d.tokens = Some(tokens))?;
    spotify::me(state).await
}

/// Atende requisições até chegar a do `/callback`, e devolve o `code`.
async fn wait_for_code(listener: &TcpListener, expected_state: &str) -> Result<String> {
    loop {
        let (mut stream, _) = listener.accept().await?;
        let Some(target) = read_request_target(&mut stream).await else {
            continue;
        };

        let url = Url::parse(&format!("http://127.0.0.1{target}")).ok();
        let Some(url) = url.filter(|u| u.path() == "/callback") else {
            // favicon.ico e afins
            respond(&mut stream, "404 Not Found", "").await;
            continue;
        };

        let param = |key: &str| url.query_pairs().find(|(k, _)| k == key).map(|(_, v)| v.into_owned());

        let result = if let Some(error) = param("error") {
            Err(Error::msg(if error == "access_denied" {
                "Login cancelado.".to_string()
            } else {
                format!("O Spotify recusou o login: {error}")
            }))
        } else if param("state").as_deref() != Some(expected_state) {
            Err(Error::msg("Resposta de login inválida (state não confere)."))
        } else {
            param("code").ok_or_else(|| Error::msg("O Spotify não devolveu o código de login."))
        };

        let page = match &result {
            Ok(_) => page("Conectado!", "Pode fechar esta aba e voltar para o Spotify Scheduler."),
            Err(e) => page("Não deu certo", &e.to_string()),
        };
        respond(&mut stream, "200 OK", &page).await;
        return result;
    }
}

async fn read_request_target(stream: &mut TcpStream) -> Option<String> {
    let mut buf = vec![0u8; 8192];
    let mut len = 0;
    while len < buf.len() {
        let n = stream.read(&mut buf[len..]).await.ok()?;
        if n == 0 {
            break;
        }
        len += n;
        if buf[..len].windows(4).any(|w| w == b"\r\n\r\n") {
            break;
        }
    }
    // "GET /callback?code=... HTTP/1.1"
    let head = String::from_utf8_lossy(&buf[..len]);
    let mut parts = head.lines().next()?.split_whitespace();
    (parts.next()? == "GET").then_some(())?;
    parts.next().map(str::to_string)
}

async fn respond(stream: &mut TcpStream, status: &str, body: &str) {
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(response.as_bytes()).await;
    let _ = stream.shutdown().await;
}

fn page(title: &str, message: &str) -> String {
    let escape = |s: &str| s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;");
    format!(
        r#"<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>{t}</title>
<style>body{{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#0a0a0a;color:#fafafa}}
main{{text-align:center;padding:24px}}h1{{color:#1ed760;font-size:22px}}p{{color:#a3a3a3}}</style>
<main><h1>{t}</h1><p>{m}</p></main></html>"#,
        t = escape(title),
        m = escape(message)
    )
}
