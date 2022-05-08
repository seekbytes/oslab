+++
title = "Lezione 8 - MentOS Buddy System"
slug = "8-mentos-buddy-system"
description = "Gestione della memoria in MentOS, comprende strutture dati della memoria e buddy system."
date = 2022-05-03
author = "SeekBytes"
+++

## Gestione della memoria fisica

In un sistema a 32 bit, i 4GB di spazio di indirizzamento della RAM sono divisi in pagine frammentate. Il processore x86 nella modalità 32 bit supporta pagine di 4KB, 2MB oppure 4MB. 4 Kybte è la tipica dimensione di una pagina frammentata.

Per il kernel, le pagine frammentate nella memoria fisica sono l'unità base per la gestione della memoria.

### Page descriptor

Il kernel deve tenere traccia dello stato corrente di ogni pagina. Per esempio, deve determinare se una pagina: è libera, contiene alcune strutture o codice del kernel, se è associata ad un processo utente.

La struttura `page_t` mantiene l'informazione di stato di una pagina:

{{<highlight c>}}
struct page_t {
	int _count;
	unsigned int private;
	struct list_head lru;
	// continue
}
{{</highlight>}}

Attributi di una pagina:

* `_count`: se è impostata ad 1, la pagina corrispondente è libera. Altrimenti, la pagina è assegnata ad uno o più processi oppure è stata usata dal kernel.
* `private`: quando la pagina è libera (utilizzata dal buddy system)
* `lru`: puntatore alla double linked list LRU (_Last Recently Used_) (utilizzata dal buddy system)

### Zone descriptor

Il kernel partiziona la memoria fisica in tre zone diverse:
* `ZONE_DMA` (<16 MB): questa zona contiene le pagine che possono essere utilizzate dal DMA
* `ZONE_NORMAL` (16-896 MB): questa zona contiene le normali pagine mappate
* `ZONE_HIGHMEM` (>896 MB): questa zona contiene "l'high memory" che sono le pagine non permanentemente mappata nello spazio di indirizzamento del kernel

Ogni zona di memoria ha il suo descrittore.

{{<highlight c>}}
struct zone {
	unsigned long free_pages; // Number of free pages in the zone.
	free_area_t free_area[MAX_ORDER]; // buddy blocks (see next)
	page_t *zone_mem_map; // pointer to first page descriptor
	uint32_t zone_start_pfn; // Index of the first page frame
	unsigned long size; // Total size of zone in pages
	char *name; // Name of the zone
}
{{</highlight>}}


### Zoned page frame allocator

Zoned page frame allocator è un sottosistema kernel che gestisce le richieste di allocazione e de-allocazione della memoria per un gruppo continuo di pagine. 

L'allocatore delle pagine fornisce le seguenti funzioni per richiedere o rilasciare frame di pagine:

* `alloc_pages(zone, order)`:\
Funzione utilizzata per richiedere 2^order page frame da una determinata zone. Ritorna la prima pagina page_t di un blocco di 2^order page frame contigue oppure ritorna NULL se l'allocazione è fallita.

* `free_pages(page, order)`:\
Funzione utilizzata per rilasciare 2^order pagine contigue da una determinata zona.

N.B: Abitualmente quete funzioni non ricevono una zona come un argomento, ma hanno una flag Get Free Page (GFP) (`GFP_KERNEL`, `GFP_USER`, `GFP_DMA`).

## Buddy system

Il buddy system è una strategia robusta ed efficiente per allocare gruppi di pagine frame contigue in potenze di 2. Tutte le pagine libere sono raggruppate in 11 liste di blocchi che contengono rispettivamente 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024 pagine contigue.

La più grande richiesta di 1024 page frame corrisponde ad 4MB di dati contigui dalla RAM. La richiesta più piccola corrisponde ad una sola pagina di dimensione di 4KB di RAM. 

Guardiamo come l'algoritmo funziona con un semplice esempio.

### Stato iniziale

Array di Page_t che descrive lo stato di ogni frame:

Numero | \_count | private
-- | -- | --
7 | -1 | 0
6 | -1 | 0
5 | -1 | 0
4 | -1 | 0
3 | -1 | 0
2 | -1 | 0
1 | -1 | 0
0 | -1 | 3

TODO: Esempio

### Algoritmo alloc_pages

#### Soddisfacimento della richiesta

Algoritmo 1 per cercare un blocco sufficientemente grande per soddisfare la richiesta.

**Richiede**: `free_area` array `f`, richiesta `ro`

**Output**: blocco oppure NULL

{{<highlight ruby>}}
fo = ro
	while fo < MAX ORDER do
		if !empty(f[fo]) then
			return fo
		end if
		fo = fo + 1
	end while
return NULL
{{</highlight>}}

#### Rimuovere un blocco di pagine libere

Algoritmo 2 per rimuovere un blocco di pagine libere.

**Richiede**: array f di free_area, il blocco trovato

**Output**: blocco di pagine

{{<highlight ruby>}}
block = getFirstBlock(f[fo])
removeBlock(f[fo], block)
return block
{{</highlight>}}

#### Splitting del blocco

L'algoritmo 3 serve per dividere un blocco sufficientemente grande per la richiesta. La funzione _splitRight_ prende in input un blocco e ritorna la metà di destra. La funzione _splitLeft_ prende in input un blocco e ritorna la metà di sinistra.

**Richiede**: l'array f di free_area, la richiesta ro, l'ordine fo e il blocco block

{{<highlight ruby>}}
while fo > ro do
	free block = splitRight(block)
	fo = fo - 1
	addBlock(f[fo], free block)
	block = splitLeft(block)
end while	
{{</highlight>}}

TODO: Esempi

### free_pages

#### Ricerca di un blocco sufficientemente grande a soddisfare la richiesta 

**Input**: free_area f, blocco b, ordine o

{{<highlight ruby>}}
while o < MAX ORDER - 1 do
	buddy = getBuddy(b, o)
	if !free(buddy) | order(buddy) != o then
		break;
	end if
	removeBlock(f[o], buddy)
	if buddy < b then
		b = buddy
	end if
	o = o + 1
end while
addBlock(f[o], b)
{{</highlight>}}

## Gestione della memoria virtuale

Il kernel applica la memoria virtuale per mappare gli indirizzi virtuali agli indirizzi fisici. 

Vantaggi:

* La RAM può essere virtualmente suddivisa in spazio kernel o spazio utente;
* ogni singola pagina può avere differenti permessi;
* ogni processo ha il suo mapping di memoria;
* un processo può accedere solo ad un determinato sottoinsieme di memoria fisica disponibile;
* un processo può essere rilocabile;

Come un processore tradure un indirizzo virtuale in uno fisico?

### Memory Management Unit

La Memory Management Unit è il componente hardware che mappa gli indirizzi virtuali in indirizzi fisici. Vantaggi: la mappatura viene eseguita in hardware, quindi nessuna penalizzazione delle prestazioni, stesse istruzioni della CPU utilizzate per accedere alla RAM e all'hardware mappato.

Come fa il kernel a tenere traccia della mappatura tra la pagina virtuale di un processo pagina virtuale di un processo al suo corrispondente page frame? Per ogni pagina virtuale del processo, il Kernel mantiene una corrispondente Page Table Entry (PTE).

* P se impostato, la pagina è in memoria fisica.
* R/W se impostato, la pagina è in modalità lettura/scrittura.
* U/S se impostato, la pagina è accessibile a tutti.
* A se impostato, la pagina è stata acceduta.
* D se impostato, la pagina è sporca.
Come fa il kernel a tenere traccia della mappatura delle pagine virtuali di tutti i processi pagine virtuali di tutti i processi ai loro corrispondenti page frame?

Per ogni processo, il Kernel organizza i suoi PTE in una struttura dati gerarchica a due livelli struttura dati a due livelli:

**Primo livello**: una Page Directory che raccoglie 1024 indirizzi di Page Table.\
**Secondo livello**: una Page Table raccoglie 1024 voci di tabella di pagina.

### Memory descriptor

Il descrittore di memoria è la struttura dati del Kernel usata per descrivere:
* tabelle di pagina: Il processo usa indirizzi virtuali. Le tabelle di pagina permettono all'unità di gestione della memoria di trasformare un indirizzo logico in un indirizzo fisico.
* regioni di memoria: Il layout di memoria di un processo è diviso in regioni (.text, .data, ecc.), ognuna delle quali ha permessi di utilizzo e dimensioni.

N.B.: Le regioni di un processo sono chiamate segmenti nella terminologia di Linux! Non confondete le regioni del processo con la segmentazione della memoria. Nelle prossime diapositive, parleremo delle regioni .text, .data come segmenti!

La struttura `mm_struct` mm (chiamato descrittore di memoria) di una task struct raccoglie i seguenti attributi:

{{<highlight c>}}
struct mm_struct {
	unsigned long start_stack; // start address of stack segment
	unsigned long mmap_base; // start address of memory mapping
	unsigned long brk; // end address of heap segment
	unsigned long start_brk; // start address of heap segment
	unsigned long end_data; // end address of data segment
	unsigned long start_data; // start address of data segment
	unsigned long end_code; // end address of code segment
	unsigned long start_code; // start address of code segment
	struct vm_area_struct *mmap; // list of memory region descr.
	pgd_t *pgd; // pointer to page directory
}
{{</highlight>}}

### Segment descriptor

Il campo vm_area_struct `mmap` di un descrittore di memoria è la struttura di dati utilizzata per rappresentare un'area di memoria virtuale contigua all'interno di un segmento di un processo.

{{<highlight c>}}
struct vm_area_struct {
	unsigned long vm_start; // start address of segment
	unsigned long vm_end; // end address of segment
	unsigned long flag; // access permissions
	struct file *vm_file; // pointer to mapped file
	struct vm_area_struct *next; // next region of process
}
{{</highlight>}}

Perché abbiamo di nuovo l'indirizzo iniziale e finale qui?
Consiglio: una pagina (4KB) è l'unità di base della memoria. Quando un processo chiede di memoria, riceve le pagine dal Kernel.

Ogni area di memoria virtuale identifica un intervallo lineare di indirizzi di pagine logiche contigue e ha sempre una dimensione multipla della dimensione della pagina. Il descrittore di memoria riporta l'ultimo byte utilizzato all'interno del segmento di ogni processo segmento.

TODO: Slide sul segmentation fault e rappresentazione memoria

{{<highlight c>}}
size_t size = sizeof(int) * 1536; // 6KB
int *i = (int *) malloc (size);
for (int j = 0; j < 1536; ++j)
	i[j] = j;
{{</highlight>}}

Il flag di campo della struct `vm_area` riporta i dettagli su tutte le pagine del segmento di un processo: cosa contengono, quali diritti ha il processo per accedere ad ogni pagina, come può crescere il segmento, ecc.

Nome | Descrizione
-- | --
`VM_READ` | Le pagine possono essere lette
`VM_WRITE` | Le pagine possono essere scritte
`VM_EXEC` | Le pagine possono essere eseguite
`VM_SHM` | La regione è usata per la memoria condivisa di IPC
`VM_LOCKED` | Le pagine sono bloccate e non possono essere scambiate
`VM_GROWSDOWN` | La regione può espandersi verso indirizzi inferiori
`VM_GROWSUP` | La regione può espandersi verso indirizzi più alti