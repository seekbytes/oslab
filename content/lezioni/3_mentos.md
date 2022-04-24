+++
title = "Lezione 3.A - Fondamentali di MentOS"
slug = "3-mentos"
date = 2021-11-29
description = "Prima parte: introduzione a MentOS e come funziona."
author = "SeekBytes"
syscall = ["list_head_empty", "list_head_add", "list_head_add_tail", "list_head_del", "list_entry", "list_for_each"]
+++

## Che cosa è?

MentOS è un sistema operativo open-source utilizzato per scopi didattici. MentOS può essere scaricato dalla repository Github gratuita: [github.com/MentOS](https://github.com/mentos/). L'obiettivo di MentOS è di fornire un ambiente progettuale che sia abbastanza realistico da mostrare come funziona un vero sistema operativo, ma, allo stesso tempo, abbastanza semplice che gli studenti possano capirlo e modificarlo in modo significativo.

Ma se ci sono così tanti sistemi operativi, perché qualcuno ha scritto MentOS? È vero, ci sono molti sistemi operativi per l'istruzione, MA quanti di loro seguono le linee guida definita da Linux? MentOS mira ad avere le stesse strutture dati e algoritmi di Linux. Ha un codice sorgente ben documentato, e puoi compilarlo sul tuo portatile in pochi secondi! Se sei un principiante nello sviluppo di sistemi operativi, forse MentOS è il sistema operativo giusto per iniziare.

## Concetti fondamentali

### Registri CPU

Esistono tre tipi di registri nella CPU:

* registri di general-purpose
* registri segment
* registri di stato e di controllo

#### Registri General Purpose

Gli otto registri di uso generale a 32 bit sono usati per contenere operandi per operazioni logiche e aritmetiche, operandi per il calcolo degli indirizzi e puntatori di memoria. Quanto segue mostra per cosa sono usati:

* `EAX`: Accumulatore per operandi e dati dei risultati;
* `EBX`: puntatore ai dati nel segmento DS;
* `ECX`: Contatore per le operazioni di loop;
* `EDX`: puntatore I/O;
* `ESI`: Puntatore ai dati nel segmento indicato dal registro DS;
* `EDI`: Puntatore ai dati nel segmento indicato dal registro ES;
* `EBP`: puntatore ai dati sullo stack (nel segmento SS);
* `ESP`: puntatore allo stack (nel segmento SS).

### Registri di stato e di controllo

I due registri di controllo di stato a 32 bit sono usati per:
* `EIP`: puntatore di istruzione (noto anche come "program counter");
* `EFLAGS`: Mantenere un gruppo di flag di stato, di controllo e di sistema.

Tabella con le flag:

Bit | Descrizione | Categoria
-- | -- | --
0 | Carry Flag | Status
2 | Parity Flag | Status
4 | Adjust Flag | Status
6 | Zero Flag | Status
7 | Sign Flag | Status
8 | Trap Flag | Controllo
9 | Interrupt enable flag | Controllo
10 | Direction flag | Controllo
11 | Overflow flag | Status
12-13 | Privilege level
....


### Privilegi

Ci sono quattro livelli di privilegio, numerati da 0 (il più privilegiato) a 3 (il meno privilegiato).

In qualsiasi momento, una CPU x86 è in esecuzione in un livello di privilegio specifico, che determina quale codice può e non può essere eseguito.
Quale delle seguenti operazioni può fare quando la CPU è in modalità utente?

1. aprire un file
2. stampare sullo schermo;
3. allocare la memoria.

Ogni volta che la CPU cambia livello di privilegio, si verifica un cambio di contesto! Esempio di eventi che fanno cambiare modalità di esecuzione alla CPU: Un clic del mouse, la digitazione di un carattere sulla tastiera, una chiamata di sistema...

### Programmable Interrupt Controller (PIC)

Un controllore di interrupt programmabile è un componente che combina diversi interrupt
su una o più linee della CPU.

Esempio di richiesta di interrupt:
* viene premuto un tasto della tastiera
* Il PIC alza la linea INTR e presenta IRQ 1 alla CPU
* La CPU salta in modalità Kernel per gestire la richiesta di interrupt
* La CPU legge dalla tastiera il tasto premuto
* La CPU invia indietro ACK per notificare che IRQ 1 è stato gestito
* La CPU torna in modalità utente

Il timer è un componente hardware a parte della CPU. Ad una frequenza fissa, il timer alza un segnale collegato all'IRQ 0 del PIC. Linux fissa la frequenza del timer a 100 Hz. La CPU esegue un processo utente per un massimo di 10 millisecondi, poi il Kernel riprende il controllo della CPU.

### Organizzazione della memoria

Il kernel applica la memoria virtuale per mappare gli indirizzi virtuali agli indirizzi fisici. La RAM è virtualmente divisa in spazio Kernel (1GB) e spazio utente (3GB). La CPU in Ring 0 ha visibilità su tutta la RAM. La CPU nel Ring 3 ha visibilità solamente dello spazio utente.

## Kernel Doubly-Linked list

I kernel dei sistemi operativi, come molti altri programmi, hanno spesso bisogno di mantenere elenchi di strutture di dati. Per ridurre la quantità di codice duplicato codice, gli sviluppatori del kernel hanno creato un'implementazione standard di liste circolari a doppio link.

Pro:
* Più sicuro/veloce della propria implementazione ad-hoc.
* Viene fornito con diverse funzioni già pronte all'uso.

Contro:
* La manipolazione dei puntatori può essere difficile.

Per utilizzare il meccanismo della lista, gli sviluppatori del kernel hanno definito la struttura dei dati della testa della lista come segue:

{{<highlight c>}}
typedef struct list_head {
	struct list_head *next, *prev;
} list_head_t;
{{</highlight>}}

Una list_head rappresenta un nodo di una lista!

Per utilizzare la funzione di lista di Linux, abbiamo solo bisogno di incorporare una testa di lista all'interno delle strutture che compongono la lista.

{{<highlight c>}}
struct mystruct {
	//...
	list_head_t list;
	//...
};
{{</highlight>}}

Le istanze di mystruct possono ora essere collegate per creare una lista double-linked!

La testa di una lista deve essere una struttura di tipo `list_head_t`

{{<highlight c>}}
struct mystruct {
	//...
	list_head_t list;
	//...
};
{{</highlight>}}

La head è sempre presente nella lista circolare. Se una lista è vuota, allora esise solo la head.

### Funzioni di supporto

Funzioni di supporto da usare con una lista circolare a doppio link.
* `list_head_empty(list head t *head)`:\
Restituisce un valore diverso da zero se la lista data è vuota.

* `list_head_add(list_head_t *new, list_head_t *listnode)`:\
Questa funzione aggiunge la nuova voce immediatamente dopo il listnode.

* `list_head_add_tail(list_head_t *new, list_head_t *listnode)`:\
Questa funzione aggiunge la nuova voce immediatamente prima del listnode.

* `list_head_del(list_head_t *entry):`\
La voce data viene rimossa dalla lista.

#### List_entry

{{<highlight c>}}
(type *) list_entry(list_head_t *ptr, struct_type, field_name)
{{</highlight>}}

Restituisce la struct che incorpora una testa di lista. In dettaglio:
* `ptr` è un puntatore ad una testa di lista t;
* `type` of struct è il nome del tipo della struct che incorpora una list_head_t;
* `field` name è il nome della testa di lista t puntata all'interno della struct.

{{<summary title="Esempio di come utilizzare la list_entry.">}}
{{<highlight c>}}
// Example showing how to get the first mystruct from a list
list_head_t *listptr = head.next;
struct mystruct *item = list_entry(listptr, struct mystruct, list);
{{</highlight>}}
{{</summary>}}

#### List_for_each

Itera su ogni elemento di una lista doppiamente collegata. In dettaglio:
* `ptr` è un puntatore variabile libero di tipo `list_head_t`;
* `head` è un puntatore al nodo di testa di una lista.

Partendo dal primo elemento della lista, ad ogni chiamata `ptr` viene impostato con l
l'indirizzo del prossimo elemento della lista fino a quando non viene raggiunta la sua testa.

{{<summary title="Esempio di come utilizzare la list_for_each">}}
{{<highlight c>}}
list_head_t *ptr;
struct mystruct *entry;
// Inter over each mystruct item in list
list_for_each(ptr, &head) {
	entry = list_entry(ptr, struct mystruct, list);
}
{{</highlight>}}
{{</summary>}}
