+++
title = "Lezione 7.C - MentOS Deadlock"
slug = "7-c-mentos-deadlock"
date = 2022-04-26
+++

## Aspetti teorici

{{<definition name="Deadlock">}}
Stato di un sistema concorrente con risorse condivise tra processi, in cui almeno un singolo processo è in attesa di un'acquisizione di risorse che può essere rilasciata da un altro processo senza risoluzione.
{{</definition>}}

Se vuoi evitare il deadlock devi prevenire il verificarsi di almeno di una delle seguenti condizioni:
* mutua esclusione
* hold and wait
* no pre-emption
* attesa circolare

{{<definition name="Stato safe">}}
Lo stato del sistema è sicuro se è possibile trovare una sequenza di allocazioni di risorse che soddisfano i requisiti delle risorse dei compiti, altrimenti non è sicuro.
{{</definition>}}

La prevenzione però è possibile solamente nel momento in cui si conoscono quante risorse devono essere allocate e in che modo. Non molto semplice da fare.

Metodologie che sono basate sul concetto dello stato unsafe:
* Prevenzione dinamica: controlla ogni richiesta di allocazione se porta ad uno stato non sicuro;
* Rilevazione: rileva solamente quando accade uno stato non sicuro;

Per esempio: algoritmo del banchiere.

## Algoritmo del banchiere

Idea principale dell'algoritmo del banchiere: soddisferò la tua richiesta solo se sono sicuro di soddisfare le richieste che altri possono chiedere.
Non è così generoso perché considera il limite superiore delle risorse richieste => Svantaggio: possibile starvation.

Metodologie alternative:

* Prevenzione statica: vincoli di progettazione per falsificare le condizioni di deadlock;
* Rilevamento e recupero: rollback o, nel peggiore dei casi, riavvio del sistema;
* Non gestito: i programmatori devono scrivere del buon codice (es. Linux);

### Notazioni e variabili

* `n`: Numero attuale di risorse nel sistema.
* `m`: Numero attuale di tipi di risorse nel sistema.
* `req_task`: Processo che esegue la richiesta della risorsa.
* `req_vec[m]`: Istanze di risorsa richieste dal task req.
* `available[m]`: Numero di istanze di risorse disponibili per ogni tipo di risorsa.
* `max[n][m]`: Numero massimo di istanze di risorse che ogni task può richiedere;
* `alloc[n][m]`: Attuale allocazione di istanze di risorse per ogni compito.
* `need[n][m]`: Attuale necessità di istanze di risorse per ogni compito.\
 `need[i][j] = max[i][j] - alloc[i][j]`.

### Pseudocodice

#### Richiesta di risorsa

{{<highlight pseudocode>}}
if req vec > need[req task] then
	error()
end if
if req vec > available then
	wait()
end if
available = available - req vec
alloc[req task] = alloc[req task] + req vec
need[req task] = need[req task] - req vec
if !safe state() then
	available = available + req vec
	alloc[req task] = alloc[req task] - req vec
	need[req task] = need[req task] + req vec
end if
{{</highlight>}}

#### Controllo stato safe

{{<highlight pseudocode>}}
work[m] = available; finish[n] = (0,...,0)
while finish[] != (1,...,1) do
	for i=0 to n do
		if !finish[i] and work >= need[i] then
			break
		end if
	end for
	if i == N then
		return false // UNSAFE
	else
		work = work + alloc[i]
		finish[i] = 1
	end if
end while
return true // SAFE
{{</highlight>}}

## Prevenzione del deadlock su MentOS

La prevenzione dei deadlock non è facile da eseguire, perché abbiamo bisogno di conoscere in anticipo le informazioni sull'esecuzione dei compiti. In particolare, abbiamo bisogno di riempire le matrici available, max, alloc, need.

Cosa dobbiamo fare per ottenere le matrici?
* available: necessità di una lista di risorse create;
* max: necessità di sapere per ogni compito quali sono le risorse che gli interessano.
* alloc: necessità di sapere a quale processo è stata assegnata una risorsa.
* need: necessità di una libreria per gestire le matrici (anche per l'algoritmo
stesso).

Ipotesi fatte:
* Ogni semaforo creato appartiene ad una risorsa esistente.
* Ogni risorsa può essere utilizzata dal processo che l'ha creata e dai processi figli.

Cosa è stato implementato:
* Definizione della resource_t con riferimento al compito che la possiede.
* Creazione della lista globale delle risorse create.
* Elenco delle risorse per le quali i compiti sono interessati, nella task_struct.
* Copia di questo elenco nella struct del task figlio durante il fork della syscall.
* Creazione di risorse durante la creazione del semaforo nella syscall lato kernel.
* Implementazione della libreria matematica arr.

{{<highlight c>}}
typedef struct resource {
	/// Resource index. The resources indexes has to be continuous: 0, 1, ... M.
	size_t rid;
	/// List head for resources list.
	list_head resources_list;
	/// Number of instances of this resource. For now, always 1.
	size_t n_instances;
	/// If the resource has been assigned, it points to the task assigned,
	/// otherwise NULL.
	task_struct *assigned_task;
	/// Number of instances assigned to assigned task.
	size_t assigned_instances;
} resource_t;
{{</highlight>}}

{{<highlight c>}}
typedef struct task_struct {
	...
	/// Array of resource pointers that task need for.
	struct resource *resources[TASK_RESOURCE_MAX_AMOUNT];
	...
} task_struct;
{{</highlight>}}

### Libreria arr_math

L'implementazione dell'algoritmo di Banker ha bisogno di gestire matrici e array. Potete trovare la definizione di `arr_math` in `mentos/inc/experimental/math/arr_math.h`. Quello che segue è un riassunto delle definizioni:

* `uint32_t *all(uint32 t *dst, uint32 t value, size_t length);`\
Inizializza l'array di destinazione con un valore.
* `uint32_t *arr sub(uint32 t *left, const uint32 t *right, size_t lunghezza);`\
Sottrazione degli elementi dell'array, salvata nel puntatore `left`.
* `uint32_t *arr add(uint32 t *left, const uint32 t *right, size_t lunghezza);`\
Addizione di elementi dell'array, salvata nel puntatore `left`.

* `bool_t arr_g_any(const uint32 t *left, const uint32 t *right, size_t length);`
Controlla che almeno un elemento dell'array sia maggiore del rispettivo
altro. Es. [1, 1, 6] g_any[1, 2, 3] = true

* `bool_t arr_g(const uint32 t *left, const uint32 t *right, size_t lunghezza);`
Controlla che tutti gli elementi dell'array siano maggiori degli altri. Es. [2, 3, 4] g_all[1, 2, 3] = true
* `arr_ge_any`: maggiore o uguale ad almeno uno.
* `arr_ge`: maggiore o uguale a tutti gli elementi.
* `arr_l_any`, `arr_le_any`: minore (e meno o uguale) ad almeno uno.
* `arr_l`, `arr_le`: meno e meno o uguale a tutti gli elementi.
* `arr_e`, `arr_ne`: uguale e non uguale a tutti gli elementi

### Esercizio

#### Preparazione

**Richiede**: syscall dei semafori e algoritmi di scheduling implementati.

1. `cd <mentos-main-dir>`
2. `git checkout --track origin/feature/Feature-DeadlockExercise`
3. `git pull`
4. Prepara MentOS con l'implementazione di un algoritmo di scheduling e i semafori.\
`mentos/src/process/scheduler_algorithm.c`\
`src/experimental/smart_sem_user.c`

**Esercizio**: implementare l'algoritmo del banchiere in MentOS partendo dal template dato `mentos/src/experimental/deadlock prevention.c`

**Controllare i risultati**:
Costruire il progetto:
1. `cd <mentos-main-dir>`
2. `mkdir build && cd build`
3. `cmake -DENABLE_DEADLOCK_PREVENTION=ON ..`
4. Costruire: `make`
5. Esegui: `make qemu`
Controllare nella console di debug per la prevenzione dei deadlock deterministica simulazione.Provate la riga di comando della shell `deadlock [-i <iterazioni>]` per testare la prevenzione dei deadlock in processi reali.