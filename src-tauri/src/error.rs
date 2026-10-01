use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// Mensagem pronta para mostrar ao usuário.
    #[error("{0}")]
    Message(String),
    #[error("Falha de rede: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Falha ao acessar arquivo: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON inválido: {0}")]
    Json(#[from] serde_json::Error),
}

impl Error {
    pub fn msg(message: impl Into<String>) -> Self {
        Self::Message(message.into())
    }
}

// Comandos Tauri precisam de erros serializáveis; o front recebe só a mensagem.
impl Serialize for Error {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
