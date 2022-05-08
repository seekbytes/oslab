+++
title = "Lezione 7.A - Struttura di MentOS"
slug = "7-a-struttura-mentos"
description = "Struttura delle cartelle e file progetto MentOS."
date = 2022-04-26
+++

## L'informatica: una ricetta per il divertimento

Dal dizionario "fun": divertimento. No, sbagliato. Perdere è divertente! In ogni modo, ti tiene occupato. Vincere non è tutto, ma anche perdere fa schifo.

## Introduzione a MentOS

MentOS è un sistema operativo open-source per scopi didattici e può essere scaricato da [Github](https://github.com/mentos-team/). Potete trovare i contributors su github.

## Struttura di MentOS

MentOS (root):
* `doc`: documentazione di MentOS
* `files`: lista di file visibili all'interno di MentOS, una volta eseguiti
* `initscp`: programma per preparare il filesystem
* `third_party`: compiler assembly (NASM)
* `MentOS`: il codice sorgente del sistema operativo
	* `inc`: headers
	* `src`: codice sorgente c

Dentro `src/inc`, possiamo trovare
* `descriptor_tables`: Descriptor tables (Global Descriptor Table), Local Descriptor Table, e Interrupt Descriptor Table
* `devices` : FPU
* `drivers`: Mouse, tastiera, ATA
* `elf` : per gestire gli eseguibili
* `fs`: il filesystem in generale
* `hardware`: pic8259, timer
* `io`: mappatura dei dispositivi su memoria e video
* `ui`: shell e i suoi comandi

* `libc`: strutture dati in generale e funzioni
* `mem`: gestione della memoria (paging, heap, buddy system)
* `process`: processi e scheduler
* `sys`: strutture dati per le system call
* `system`: meccanismo delle system call