+++
title = "Lezione 3.B - MentOS Scheduling"
slug = "3-b-mentos-scheduling"
date = 2021-11-29
description = "Seconda parte di MentOS: scheduling e strutture dati adibite allo scheduler."
author = "SeekBytes"
+++

## Process descriptor

`task_struct` è la struttura dati utilizzata dal kernel per rappresentare un processo.

{{<highlight c>}}
struct task_struct {
	pid_t pid; // the process identifier
	unsigned long state; // the current process’s state
	struct task_struct *parent; // pointer to parent process
	struct list_head children; // list of children process
	struct list_head siblings; // list of siblings process
	struct mm_struct *mm; // memory descriptor
	struct sched_entity se; // time accounting (aka schedule entity)
	struct thread_struct thread; // context of process
	struct list_head run_list ; // pointer to the process into the scheduler
}
{{</highlight>}}

### PID

Process Identifier (PID) è un valore numerico che identifica un processo. Quando un nuovo processo viene creato. un nuovo PID viene generato sommando 1 all'ultimo PID assegnato.
In Linux, il valore massimo per un PID è `32768`. Quando il valore massimo del PID è raggiunto, l'ultimo PID assegnato viene riportato a 0 prima di cercare un nuovo PID.
La macro `RESERVED_PID` (di solito impostata a 300) è definita per riservare i PID ai processi di sistema e ai demoni, cioè ai processi che forniscono un servizio (ad esempio un server web). Tutti i processi dell'utente hanno PID maggiori di `RESERVED_PID`.

### Stato di un processo

Lo stato del processo è un valore numerico che descrive lo stato attuale del
processo. Un processo può essere in uno dei seguenti stati:
* `TASK_RUNNING`: o il processo è attualmente in esecuzione, o ha tutte le risorse per essere eseguito tranne la CPU.
* `TASK_INTERRUPTIBLE`: il processo è bloccato (sleep), in attesa di qualche condizione da eseguire. Quando questa condizione esiste, il kernel imposta lo stato del processo a `TASK_RUNNING`. Il processo inoltre si risveglia e diventa eseguibile se riceve un segnale (es, risorse rilasciate).
* `TASK_UNINTERRUPTIBLE`: questo stato è identico a `TASK_INTERRUPTIBLE` ma non dipende da un segnale specifico, deve aspettare senza interruzione per una specifica chiamata weak-up (ad esempio, task in attesa di dati trasferiti dal blocco dev al buffer).
* `TASK_STOPPED`: l'esecuzione del processo si è fermata; il compito non è in esecuzione né è idoneo all'esecuzione.
* `EXIT_ZOMBIE`: l'esecuzione del processo è terminata, ma il processo padre non ha ancora emesso una chiamata di sistema `wait(0)` o `waitpid()` per restituire informazioni sul processo morto.
* `EXIT_DIED`: Lo stato finale: il processo è stato rimosso dal sistema perché il processo padre ha appena emesso una chiamata di sistema `wait()` o una chiamata di sistema `waitpid()` per esso.

### Relazioni tra processi

I processi creati da un programma hanno una relazione genitore/figlio. Quando un processo crea più figli, questi figli hanno relazioni "fraterne".

{{<highlight c>}}
struct task_struct {
	// ...
	pid_t pid; // the process identifier
	struct task_struct *parent; // pointer to parent process
	struct list_head children; // list of children process
	struct list_head siblings; // list of siblings process
	// ...
}
{{</highlight>}}

Campi della `task_struct` che descrivono le relazioni tra i processi:
* parent: puntatore al genitore del processo;
* children: La testa della lista che contiene tutti i figli creati dal processo.
* sibling: La testa della lista che contiene tutti i figli creati dal genitore del processo.

### Time accounting

La struttura `sched_entity` se di una task_struct riporta la priorità e i tempi di esecuzione di un processo.

{{<highlight c>}}
struct task_struct {
	//..
	struct sched_entity se; // time accounting (aka schedule entity)
	//..
}
{{</highlight>}}

{{<highlight c>}}
struct sched_entity {
int prio; // priority
	time_t start_runtime; // start execution time
	time_t exec_start; // last context switch time
	time_t sum_exec_runtime; // overall execution time
	time_t vruntime; // weighted execution time
}
{{</highlight>}}

**prio**:
Definisce la priorità di esecuzione di un processo. Ha un valore nell'intervallo
[100, 139], dove 100 significa la massima priorità e 139 significa la
priorità più bassa.
Per impostazione predefinita, la priorità di un nuovo processo generato è 120.
Un processo può aumentare/diminuire il suo valore di prio usando la chiamata di sistema
`nice(inc)`, che prende come parametro di input un valore nell'intervallo [-20, 19].
Esempi:
* `nice(1)` (incrementa il valore di prio del processo chiamante di 1 unità) 120 ⇒ 121
* `nice(-5)` (decrementa il valore di prio del processo chiamante di -5 unità) 120⇒
115

Altri campi di questa struttura sono:

* **start_runtime**: il tempo di esecuzione del sistema che riporta quando il processo è stato eseguito nella CPU.
* **exec_start**: il tempo di esecuzione del sistema che riporta quando il processo è stato eseguito nella CPU.
* **sum_exec_runtime**: il tempo complessivo di esecuzione speso dal processo nella CPU.
* **vruntime**: il tempo di esecuzione virtuale, cioè il tempo di esecuzione globale ponderato trascorso dal processo nella CPU (vedi CFS).

### Contesto di un processo

La thread_struct di un task struct riporta il contesto di un processo ogni volta che viene scambiato.

{{<highlight c>}}
struct task_struct {
	// ..
	struct thread_struct thread; // context of process
	// ..
}
{{</highlight>}}

{{<highlight c>}}
struct thread_struct {
	uint32_t ebp; // base pointer register
	uint32_t esp; // stack pointer register
	uint32_t ebx; // base register
	uint32_t edx; // data register
	uint32_t ecx; // counter
	uint32_t eax; // accumulator register
	uint32_t eip; // Instruction Pointer Register
	uint32_t eflags; // flag register
	bool_t fpu_enabled; // is FPU enabled?
	savefpu fpu_register; // FPU context
}
{{</highlight>}}

## Scheduler

### Strutture dati

La struttura dati runqueue è la struttura dati più importante dello scheduler. Raccoglie tutti i processi di sistema in stato di esecuzione.

{{<highlight c>}}
struct runqueue {
	unsigned long nr_running; // number of processes in running state
	struct task_struct *curr; // pointer to current running process
	struct list_head_t queue; // list of processes in running state
}
{{</highlight>}}

Fate attenzione! `queue` è la list_head_t di una lista circolare, doppiamente collegata, che raccoglie tutti i processi di sistema in stato di esecuzione. Di conseguenza, un campo `run_list` di tipo struct `list_head` viene aggiunto nella struct `task_struct`. (Vedi le diapositive concetti fondamentali per maggiori dettagli).

### Flusso di esecuzione dello scheduler

Lo scheduler viene chiamato dopo la gestione di un interrupt/exception. In dettaglio, le seguenti operazioni sono eseguite dallo scheduler:

1. aggiorna le variabili di contabilità temporale del processo corrente;
2. prova a svegliare un processo in attesa. Se una condizione di attesa è soddisfatta, un processo viene svegliato impostando il suo stato su running, e inserendolo nella runqueue (argomento non affrontato nelle diapositive attuali);
3. esegue l'algoritmo di scheduling per scegliere il prossimo processo da eseguire da parte della CPU dalla runqueue;
4. esegue il cambio di contesto.

### Algoritmi di scheduling: selezionare il prossimo processo

`pick_next_task` è la funzione chiamata dallo scheduler per ottenere il prossimo processo da eseguire. Secondo l'algoritmo di scheduling implementato, il prossimo processo può essere scelto in modo diverso.

MentOS fornisce i seguenti algoritmi:
* **RR**: Round Robin
* **Priority** : Highest Priority First.
* **CFS** : Completely Fair Scheduler. 

#### Round Robin

Round Robin è un algoritmo di programmazione della CPU in cui una fetta di tempo fissa è assegnata ad ogni processo del sistema, in modo ciclico. È semplice, preemptive, facile da implementare e senza starvation.

**Pseudocodice dell'algoritmo Round-Robin**

Input: Processo corrente `c`, lista di processi `L`
Output: prossimo processo `n`

{{<highlight pseudocode>}}
nNode = next(c)
if isHead(L, nNode) then
	nNode = next(nNode)
end if
n = list_entry(nNode)
{{</highlight>}}

{{<summary title="Implementazione del Round Robin">}}
{{<highlight c>}}
struct runqueue {
	unsigned long nr_running; // number of processes in running state
	struct task_struct *curr; // pointer to current running process
	struct list_head_t queue; // list of processes in running state
}
{{</highlight>}}

Implementazione C dell'algoritmo Round Robin:
{{<highlight c>}}
struct task_struct * pick_next_task(struct runqueue *runqueue) {
	// nNode = next(c)
	struct list_head *nNode = runqueue->curr->run_list.next;
	// if isHead(L, nNode)
	if (nNode == &runqueue->queue)
	nNode = nNode->next;
	// n = entry(nNode)
	task_struct *next = list_entry(nNode, struct task_struct, run_list);
	return next;
}
{{</highlight>}}
{{</summary>}}

La programmazione round robin presuppone che tutti i processi siano ugualmente importanti. Questo generalmente non è vero. A volte vorremmo che i processi ad alta intensità di CPU (non interattivi) processi ad alta intensità di CPU (non interattivi) abbiano una priorità inferiore rispetto ai processi interattivi. Inoltre, diversi utenti possono avere uno stato diverso. I processi di un amministratore di sistema possono avere una priorità superiore a quelli di uno studente.

Questi obiettivi hanno portato all'introduzione del Priority Scheduling Algorithm.

#### Highest Priority First

Ogni processo ha una priorità statica. Più piccolo è il numero, più alta è la priorità del processo. Lo scheduler sceglie semplicemente il processo a più alta priorità da eseguire. Un processo è prevenuto ogni volta che un processo a priorità più alta è disponibile nella coda di esecuzione.

**Vantaggio**: lo scheduling prioritario fornisce un buon meccanismo in cui l'importanza relativa di ogni processo può essere definita con precisione.
**Svantaggio**: se i processi ad alta priorità utilizzano molto tempo di CPU, i processi a bassa priorità possono morire di fame ed essere rimandati indefinitamente, portando alla starvation.

**Pseudocodice di Highest Priority First**

Input: Processo corrente c, lista di processi L
Output: prossimo processo

{{<highlight pseudocode>}}
n = c
for all lNode ∈ L do
	if !isHead(L,lNode) then
		t = list_entry(lNode)
		if priority(t) < priority(n) then
			n = t
		end if
	end if
end for
return n
{{</highlight>}}

#### Completely Fair Scheduler

L'idea di CFS è semplice: usare la priorità di ogni processo per "pesare" il suo tempo di tempo di esecuzione (runtime virtuale). I processi con bassa priorità hanno un tempo di esecuzione virtuale che aumenta più velocemente dei processi con una priorità più alta. Lo scheduler sceglie sempre il processo con il tempo di esecuzione virtuale più basso!

Lo scheduler ha bisogno di conoscere il peso del compito per stimare la sua porzione di tempo della CPU porzione di tempo della CPU. Quindi, il numero di priorità deve essere mappato a tale peso; Questo viene fatto nell'array `prio_to_weight`:

{{<highlight c>}}
static const int prio_to_weight[] = {
	/* 100 */ 88761, 71755, 56483, 46273, 36291,
	/* 105 */ 29154, 23254, 18705, 14949, 11916,
	/* 110 */ 9548, 7620, 6100, 4904, 3906,
	/* 115 */ 3121, 2501, 1991, 1586, 1277,
	/* 120 */ 1024, 820, 655, 526, 423,
	/* 125 */ 335, 272, 215, 172, 137,
	/* 130 */ 110, 87, 70, 56, 45,
	/* 135 */ 36, 29, 23, 18, 15
};
{{</highlight>}}

Un numero di priorità di 120, che è la priorità di un compito normale, è mappato ad un peso di 1024. Si noti che il rapporto tra due voci successive nell'array è quasi 1,25. Questo numero è scelto in modo tale che:
* se la priorità di un compito è ridotta di uno, allora ottiene il 10% in più
del tempo di CPU disponibile.
* se la priorità di un compito viene aumentata di uno, allora ottiene il 10% in meno
del tempo di CPU disponibile.

Dato l'array prio_to_weight possiamo aggiornare il tempo di esecuzione virtuale di un processo p, cioè la sua esecuzione complessiva ponderata utilizzando la formula:

`vruntime += delta_exec * (NICE_0 LOAD / weight(p))`

dove:
* `vruntime` è il tempo di esecuzione virtuale del processo;
* `delta_exec` è l'ultima quantità di tempo spesa da p nella CPU;
* `NICE_0_LOAD` è il peso di un compito con priorità normale (1024);
* `weight(p)` è il peso di p definito dall'array `prio_to_weight`.

**Pseudocodice di Completely Fair Scheduler**

Input: Processo corrente `c`, Elenco dei processi `L`

Output: processo successivo `n`

{{<highlight pseudocode>}}
updateVirtualRuntime(c)
n = c
for all lNode ∈ L do
	if !isHead(L,lNode) then
		t = list_entry(lNode)
		if virtualRuntime(t) < virtualRuntime(n) then
			n = t
		end if
	end if
end for
return n
{{</highlight>}}

### Context Switch

La CPU esegue un cambio di contesto per cambiare il processo eseguito dalla CPU. L'esempio seguente mostra i passi eseguiti dal sistema operativo per salvare lo stato del processo corrente (processo 1), e poi riprendere l'esecuzione di un processo precedentemente fermato (processo 2).

1. Tempo scaduto! È il momento di restituire il controllo della CPU al kernel. Il dispositivo timer alza il segnale INTR e presenta 0 nella linea irq. Quando INTR si alza, la CPU si sposta dal Ring 3 (modalità utente) al Ring 0 (modalità kernel). Dopo che la CPU cambia livello di privilegio della CPU, i valori dei registri della CPU sono "pushati" nello stack del kernel.
2. La CPU inizia l'esecuzione di irq 0 (gestore di interrupt per gestire l'interrupt 0 dell'hardware), che è stato generato dal Timer.
3. Lo scheduler viene quindi chiamato per aggiornare le variabili di contabilità temporale del processo interrotto e scegliere il prossimo processo da eseguire. In questo esempio, lo scheduler sceglie il processo 2 come prossimo.
4. Il kernel aggiorna la struct del thread della struttura del task struct del processo 1 per salvare il suo contesto.
5. Il kernel sostituisce il contesto del processo 1 con il contesto del processo 2 nella sua memoria dello stack.
6. Il kernel sposta i valori dal suo stack ai registri della CPU ed esegue un'istruzione istruzione di assemblaggio iret, che cambia il livello di privilegio della CPU da Ring 0 (modalità kernel) a Ring 3 (modalità utente).
7. Il contesto del processo 2 è nei registri della CPU, infine. La CPU può continuare ad eseguire il codice del processo 2 in modalità utente fino al prossimo cambio di contesto.