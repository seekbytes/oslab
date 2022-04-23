# OSLAB

Documentazione per il corso di Sistemi Operativi parte di Laboratorio tenuto presso l'Università di Verona, anno accademico 2021-2022.

## Caratteristiche

Il sito web è stato costruito tramite il generatore di siti statici chiamato [GoHugo](https://gohugo.io/) che permette di trasformare una serie di contenuti scritti in linguaggio Markdown in un sito web (HTML e CSS). Attualmente OSLAB non prevede l'utilizzo di alcun Javascript.

Per abilitare una preview del sito web:
1. Clona la repository in locale
2. Scarica [Gohugo](https://gohugo.io/) (anche come singolo binario)
3. Avvia il server web con il comando `hugo serve`

Per costruire le pagine del sito web:
1. Clona la repository in locale
2. Scarica [Gohugo](https://gohugo.io/) (anche come singolo binario)
3. Costruisci le pagine con il comando `hugo`
4. All'interno della cartella `public` troverai il tuo sito web

Se vuoi minimizzare il contenuto, utilizza la flag `--minify`. Altre flag e comandi sono disponibili sul [sito ufficiale](https://gohugo.io/commands/hugo/).

## Struttura

* `content`: il contenuto, file markdown strutturati in sottocartelle così come si mostrano sul sito web.
* `static`: il contenuto statico che GoHugo include di default nella cartella in cui verranno messe le pagine costruite
* `themes`: cartella di uno o più temi (il tema è lo scheletro frontend comprendente HTML e CSS per il sito) 