# Créditos do banner

O `banner.png` do README mostra capas de álbuns como parte do screenshot do app. A arte pertence aos respectivos artistas e gravadoras e **não é versionada** neste repositório: `assets/banner/albums/*.jpg` e o `banner.html` (que embute as imagens) estão no `.gitignore`. Elas foram usadas só para ilustrar a interface.

## Capas de álbuns

Baixadas pela iTunes Search API (`https://itunes.apple.com/search`), no tamanho 600x600.

| Álbum | Artista | Arquivo |
| --- | --- | --- |
| Random Access Memories | Daft Punk | `ram.jpg` |
| Wish You Were Here | Pink Floyd | `wywh.jpg` |
| Currents | Tame Impala | `currents.jpg` |
| Back to Black | Amy Winehouse | `btb.jpg` |
| In Rainbows | Radiohead | `rainbows.jpg` |
| To Pimp a Butterfly | Kendrick Lamar | `tpab.jpg` |

## Fontes

Geist, sob a SIL Open Font License.

## Para regenerar

Busque cada álbum na iTunes Search API (`entity=album`), baixe a `artworkUrl100` trocando `100x100bb` por `600x600bb`, salve em `assets/banner/albums/` com os nomes da tabela, rode `bun build.ts` nesta pasta e renderize o `banner.html` gerado.
