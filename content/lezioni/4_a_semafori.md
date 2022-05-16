+++
title = "Lezione 4.A - IPC e Semafori"
slug = "4-a-semafori-ipc"
date = 2022-01-10
description = "SystemV, come comunicare con i semafori (apertura, chiusura, gestione e incremento/decremento)."
author = "SeekBytes"
syscall = ["IPC_PRIVATE", "ftok", "semget", "semctl", "semop"]
+++

{{<definition name="Unix System V">}}
Unix System V è una delle prime versioni commerciali del sistema operativo Unix del sistema operativo Unix. È stato originariamente sviluppato da AT&T e rilasciato per la prima volta nel 1983. Sono state rilasciate quattro versioni principali di System V, numerate 1, 2, 3, e 4. SystemV è talvolta abbreviato in SysV.
{{</definition>}}

{{<definition name="Comunicazione tra processi">}}
La comunicazione interprocesso (IPC) si riferisce a meccanismi che coordinano le attività tra processi cooperanti. Un esempio comune di questa necessità è la gestione dell'accesso a una data risorsa di sistema.
{{</definition>}}

## Introduzione alla comunicazione tra processi

System V IPCs si riferisce a tre diversi meccanismi per la comunicazione interprocesso
comunicazione:
* I semafori permettono ai processi di sincronizzare le loro azioni. Un semaforo è un valore mantenuto dal kernel, che è opportunamente modificato da processi del sistema prima di eseguire alcune azioni critiche
* Le code di messaggi possono essere utilizzate per passare messaggi tra i processi.
* La memoria condivisa permette a più processi di condividere una loro regione di memoria.

Altri tipi di IPC includono:
* Segnali
* Pipe
* FIFO

### Creazione e apertura 

Ogni meccanismo IPC di System V ha una chiamata di sistema associata get (`msgget`, `semget`, o `shmget`), che è analoga alla chiamata di sistema open. Data una chiave intera (analoga ad un nome di file), la chiamata di sistema get può creare prima un nuovo IPC e poi restituire il suo identificatore unico, oppure restituire l'identificatore di un IPC esistente. Un identificatore IPC è analogo ad un descrittore di file. Viene usato in tutte le successive chiamate di sistema per riferirsi all'oggetto IPC.

{{<summary title="Esempio: creare un semaforo">}}
{{<highlight c>}}
// PERM: rw-------
id = semget(key, 10 ,IPC_CREAT | S_IRUSR | S_IWUSR);
if (id == -1)
errExit(semget);
{{</highlight>}}
{{</summary>}}

Come per tutte le chiamate get, la chiave è il primo argomento. È un valore sensibile per l'applicazione che usa l'oggetto IPC. L'identificatore IPC restituito è un codice unico che identifica l'oggetto IPC nel sistema. Mappatura con la chiamata di sistema open(...): key -> nome del file, id ->file descriptor.

Le chiavi IPC di SystemV sono valori interi rappresentati utilizzando il tipo di dati key_t. Le chiamate IPC get traducono una chiave nel corrispondente identificatore intero identificatore IPC. Quindi, come possiamo fornire una chiave unica che ci garantisca di non ottenere accidentalmente l'identificatore di un oggetto IPC esistente usato da qualche altra applicazione?

### IPC_PRIVATE

Quando si crea un nuovo oggetto IPC, la chiave può essere specificata come `IPC_PRIVATE`.
In questo modo, si delega il problema di trovare una chiave unica al kernel.
Esempio di utilizzo di `IPC_PRIVATE`:

{{<highlight c>}}
id = semget(IPC_PRIVATE, 10, S_IRUSR | S_IWUSR);
{{</highlight>}}

Questa tecnica è particolarmente utile in applicazioni multiprocesso dove il processo padre crea l'oggetto IPC prima di eseguire un `fork()`, con il risultato che il processo figlio eredita l'identificatore dell'oggetto IPC.

### Ftok

La funzione ftok (file to key) converte un `pathname` e un proj_id (cioè identificatore di progetto) in una chiave IPC.

{{<highlight c>}}
#include <sys/ipc.h>
// Returns integer key on succcess, or -1 on error (check errno)
key_t ftok(char *pathname, int proj_id);
{{</highlight>}}

Il percorso fornito deve riferirsi a un file esistente e accessibile. Gli ultimi 8 bit del `proj_id` sono effettivamente utilizzati, e devono essere un valore non nullo. Tipicamente, il `pathname` si riferisce ad uno dei file, o directory, creati dall'applicazione.

{{<summary title="Esempio di utilizzo della funzione ftok">}}
{{<highlight c>}}
key_t key = ftok("/mydir/myfile", ’a’);
if (key == -1)
	errExit("ftok failed");
int id = semget(key, 10, S_IRUSR | S_IWUSR);
if (id == -1)
	errExit("semget failed");
{{</highlight>}}
Esempio: carattere 'a':
* ASCII = 097
* Binario = 01100001
{{</summary>}}

## Strutture dati

Il kernel mantiene una struttura dati associata (`msqid_ds`, `semid_ds`, `shmid_ds`) per ogni istanza di un oggetto System V IPC. Oltre ai dati specifici al tipo di oggetto IPC, ogni struttura dati associata include la sottostruttura ipc_perm che contiene i permessi concessi.

{{<highlight c>}}
struct ipc_perm {
	key_t __key; /* Key, as supplied to ’get’ call */
	uid_t uid; /* Owner’s user ID */
	gid_t gid; /* Owner’s group ID */
	uid_t cuid; /* Creator’s user ID */
	gid_t cgid; /* Creator’s group ID */
	unsigned short mode; /* Permissions */
	unsigned short __seq; /* Sequence number */
};
{{</highlight>}}

Alcune note:

* I campi `uid` e `gid` specificano la proprietà dell'oggetto IPC.
* I campi `cuid` e `cgid` contengono gli ID utente e gruppo del processo che ha creato l'oggetto.
* Il campo `mode` contiene la maschera dei permessi per l'oggetto IPC, che sono inizializzati usando i 9 bit inferiori dei flag specificati nella chiamata di sistema get usata per creare l'oggetto.

Alcune note importanti su `ipc_perm`:
* I campi `cuid` e `cgid` sono immutabili.
* Solo i permessi di lettura e scrittura sono significativi per gli oggetti IPC. Il permesso di esecuzione è privo di significato e viene ignorato.

{{<summary title="Esempio tipico di semctl per cambiare il proprietario di un semaforo">}}
{{<highlight c>}}
struct semid_ds semq;
// get the data structure of a semaphore from the kernel
if (semctl(semid, 0, IPC_STAT, &semq) == -1)
	errExit("semctl get failed");

// change the owner of the semaphore
semq.sem_perm.uid = newuid;

// update the kernel copy of the data structure
if (semctl(semid, IPC_SET, &semq) == -1)
	errExit("semctl set failed");
{{</highlight>}}
Allo stesso modo, le chiamate di sistema shmctl e msgctl sono applicate per aggiornare la struttura dati del kernel di una memoria condivisa e della coda dei messaggi.
{{</summary>}}

## Comandi IPC

### ipcs

Usando ipcs, possiamo ottenere informazioni sugli oggetti IPC nel sistema. Per impostazione predefinita, ipcs visualizza tutti gli oggetti, come nel seguente esempio:

{{<summary title="Esmepio ipcs">}}
{{<highlight bash>}}
user@localhost[~]$ ipcs
------ Message Queues --------
key		msqid	Owner		perms 	used-bytes 	messages
0x1235 	26		student 	620 	12 			20
------ Shared Memory Segments --------
key		msqid	Owner		perms 	bytes 	messages
0x1234 	0 		professor 	600 	8192 	2
------ Semaphore Arrays --------
key		semid	Owner		perms 	nsems
0x1111 	102		professor 	330 	20
{{</highlight>}}
{{</summary>}}

### ipcrm

Usando `ipcrm`, possiamo rimuovere gli oggetti IPC dal sistema.

{{<summary title="Rimuovere una coda di messaggi">}}
```
ipcrm -Q 0x1235 ( 0x1235 is the key of a queue )
ipcrm -q 26 ( 26 is the identifier of a queue )
```
{{</summary>}}

{{<summary title="Rimuovere un segmento di memoria condivisa">}}
```
ipcrm -M 0x1234 ( 0x1234 is the key of a shared memory seg. )
ipcrm -m 0 ( 0 is the identifier of a shared memory seg. )
```
{{</summary>}}

{{<summary title="Rimuovere una serie di semafori">}}
```
ipcrm -S 0x1111 ( 0x1111 is the key of a semaphore array )
ipcrm -s 102 ( 102 is the identifier of a semaphore array )
```
{{</summary>}}

## Semafori

### Creazione e apertura

La chiamata di sistema `semget` crea un nuovo set di semafori o ottiene l'identificatore di un set esistente.

{{<highlight c>}}
#include <sys/sem.h>
// Returns semaphore set identifier on success, or -1 error
int semget(key_t key, int nsems, int semflg);
{{</highlight>}}

Gli argomenti chiave sono: una chiave IPC, `nsems` specifica il numero di semafori in quell'insieme e deve essere maggiore di 0. `semflg` è una maschera di bit che specifica i permessi (vedi la chiamata di sistema open(...), argomento mode) da essere posti su un nuovo insieme di semafori o controllati su un insieme esistente.

In aggiunta, i seguenti flag possono essere ORed (`|`) in semflg:
* `IPC_CREAT`: se non esiste un insieme di semafori con la chiave specificata, crea un
nuovo insieme di semafori.
* `IPC_EXCL`: in combinazione con IPC CREAT, fa fallire semget se un set di semafori esiste con la chiave specificata.

{{<summary title="Esempio per creare un insieme di 10 semafori">}}
int semid;
ket_t key = //... (generate a key in some way, i.e. with ftok)
// A) delegate the problem of finding a unique key to the kernel
semid = semget(IPC_PRIVATE, 10, S_IRUSR | S_IWUSR);
// B) create a semaphore set with identifier key, if it doesn’t already exist
semid = semget(key, 10, IPC_CREAT | S_IRUSR | S_IWUSR);
//C) create a semaphore set with identifier key, but fail if it exists already
semid = semget(key, 10, IPC_CREAT | IPC_EXCL | S_IRUSR | S_IWUSR);
{{</summary>}}

### Operazioni di controllo del semaforo

La chiamata di sistema semctl esegue una varietà di operazioni di controllo su un semaforo o su un singolo semaforo all'interno di un insieme.

{{<highlight c>}}
#include <sys/sem.h>
// Returns nonnegative integer on success, or -1 error
int semctl(int semid, int semnum, int cmd, ... /* union semun arg */);
{{</highlight>}}

L'argomento semid è l'identificatore dell'insieme di semafori su cui l'operazione operazione deve essere eseguita. Alcune operazioni di controllo (cmd) richiedono un terzo/quarto argomento. Prima che presentare le operazioni di controllo disponibili su un insieme di semafori, viene introdotta l'unione `semun` viene introdotta.

L'unione semun deve essere esplicitamente definita dal programmatore prima di chiamare la syscall `semctl`.

{{<highlight c>}}
#ifndef SEMUN_H
#define SEMUN_H
#include <sys/sem.h>
// definition of the union semun
union semun {
	int val;
	struct semid_ds *buf;
	unsigned short *array;
};
#endif
{{</highlight>}}

#### Operazioni di controllo

* `IPC_RMID`: rimuovere immediatamente il semaforo impostato. Qualsiasi processo bloccato viene risvegliato (errore impostato su EIDRM). L'argomento arg non è richiesto.

* `IPC_STAT`: posiziona una copia della struttura dati semid ds associata a questo set di  semafori nel buffer indicato da arg.buf.

* `ICP_SET`: Aggiorna i campi selezionati della struttura dati semids associata a questo set di semafori usando i valori nel buffer puntato da arg.buf.

{{<highlight c>}}
struct semid_ds {
	struct ipc_perm sem_perm; /* Ownership and permissions */
	time_t sem_otime; /* Time of last semop() */
	time_t sem_ctime; /* Time of last change */
	unsigned long sem_nsems; /* Number of semaphores in set */
};
{{</highlight>}}

Solo i sottocampi `uid`, `gid` e `mode` della sottostruttura `sem_perm` possono essere aggiornati tramite `IPC_SET`.

{{<summary title="Esempio riguardo il cambio di permessi di un insieme di semafori">}}
{{<highlight c>}}
ket_t key = //... (generate a key in some way, i.e. with ftok)
// get, or create, the semaphore set
int semid = semget(key, 10, IPC_CREAT | S_IRUSR | S_IWUSR);

// instantiate a semid_ds struct
struct semid_ds ds;
// instantiate a semun union (defined manually somewhere)
union semun arg;
arg.buf = &ds;

// get a copy of semid_ds structure belonging to the kernel
if (semctl(semid, 0 /*ignored*/, IPC_STAT, arg) == -1)
	errExit("semctl IPC_STAT failed");

// update permissions to guarantee read access to the group
arg.buf->sem_perms.mode |= S_IRGRP;

// update the semid_ds structure of the kernel
if (semctl(semid, 0 /*ignored*/, IPC_SET, arg) == -1)
	errExit("semctl IPC_SET failed");
{{</highlight>}}
{{</summary>}}

{{<summary title="Esempio su come rimuovere un insieme di semafori">}}
{{<highlight c>}}
if (semctl(semid, 0/*ignored*/, IPC_RMID, 0/*ignored*/) == -1)
	errExit("semctl failed");
else
	printf("semaphore set removed successfully\n");
{{</highlight>}}
{{</summary>}}

(..continuo..)

* `SETVAL`: il valore del semaforo semnum-esimo nell'insieme a cui si riferisce da semid è inizializzato al valore specificato in arg.val.

* `GETVAL`: come risultato della sua funzione, semctl restituisce il valore del semnum-esimo semaforo nell'insieme di semafori specificato da semid. L'argomento argomento arg non è richiesto.

* `SETALL`: inizializza tutti i semafori nell'insieme a cui fa riferimento semid, usando i valori forniti nell'array indicato da arg.array

* `GETALL`: recupera i valori di tutti i semafori nell'insieme a cui da semid, mettendoli nell'array indicato da arg.array

{{<summary title="Esempio su come inizializzare un semaforo specifico in un insieme di semafori">}}
{{<highlight c>}}
ket_t key = //... (generate a key in some way, i.e. with ftok)
// get, or create, the semaphore set
int semid = semget(key, 10, IPC_CREAT | S_IRUSR | S_IWUSR);
// set the semaphore value to 0
union semun arg;
arg.val = 0;
// initialize the 5-th semaphore to 0
if (semctl(semid, 5, SETVAL, arg) == -1)
	errExit("semctl SETVAL");
{{</highlight>}}
{{</summary>}}

{{<summary title="Esempio su come recuperare lo stato corrente di un semaforo specifico in un insieme di semafori.">}}
{{<highlight c>}}
ket_t key = //... (generate a key in some way, i.e. with ftok)
// get, or create, the semaphore set
int semid = semget(key, 10, IPC_CREAT | S_IRUSR | S_IWUSR);
// get the current state of the 5-th semaphore
int value = semctl(semid, 5, GETVAL, 0/*ignored*/);
if (value == -1)
	errExit("semctl GETVAL");
{{</highlight>}}
{{</summary>}}

{{<summary title="Esempio su come inizializzare un insieme di semafori con 10 semafori">}}
{{<highlight c>}}
ket_t key = //... (generate a key in some way, i.e. with ftok)
// get, or create, the semaphore set
int semid = semget(key, 10, IPC_CREAT | S_IRUSR | S_IWUSR);
// set the first 5 semaphores to 1, and the remaining to 0
int values[] = {1,1,1,1,1,0,0,0,0,0};
union semun arg;
arg.array = values;
// initialize the semaphore set
if (semctl(semid, 0/*ignored*/, SETALL, arg) == -1)
	errExit("semctl SETALL");
{{</highlight>}}
{{</summary>}}

{{<summary title="Esempio su come recuperare l'insieme degli stati da un insieme di semafori.">}}
{{<highlight c>}}
ket_t key = //... (generate a key in some way, i.e. with ftok)
// get, or create, the semaphore set
int semid = semget(key, 10, IPC_CREAT | S_IRUSR | S_IWUSR);
// declare an array big enougth to store the semaphores’ value
int values[10];
union semun arg;
arg.array = values;
// get the current state of a semaphore set
if (semctl(semid, 0/*ignored*/, GETALL, arg) == -1)
errExit("semctl GETALL");
{{</highlight>}}
{{</summary>}}

(..continuo..)

* `GETPID`: restituisce l'ID del processo dell'ultimo processo che ha eseguito un semop sul semaforo semnum-esimo
* `GETNCNT`: restituisce il numero di processi attualmente in attesa che il valore del semaforo semnum-esimo per aumentare
* `GETZCNT`: restituisce il numero di processi attualmente in attesa del che il valore del semaforo semnum-esimo diventi 0;

{{<summary title="Esempio su come recuperare informazioni di un semaforo da un insieme di semafori">}}
{{<highlight c>}}
ket_t key = //... (generate a key in some way, i.e. with ftok)
// get, or create, the semaphore set
int semid = semget(key, 10, IPC_CREAT | S_IRUSR | S_IWUSR);
// ...
// get information about the first semaphore of the semaphore set
printf("Sem:%d getpid:%d getncnt:%d getzcnt:%d\n",
semid,
semctl(semid, 0, GETPID, NULL),
semctl(semid, 0, GETNCNT, NULL),
semctl(semid, 0, GETZCNT, NULL));
{{</highlight>}}
{{</summary>}}

**UN INSIEME DI SEMAFORI DEVE ESSERE SEMPRE INIZIALIZZATO!**

### Altre operazioni

#### SemOP

La chiamata di sistema semop esegue una o più operazioni (wait (P) e signal (V)) sui semafori.

{{<highlight c>}}
#include <sys/sem.h>

// Returns 0 on success, or -1 on error
int semop(int semid, struct sembuf *sops, unsigned int nsops);
{{</highlight>}}

L'argomento `sops` è un puntatore a un array che contiene una sequenza ordinata di operazioni da eseguire **atomicamente**, e `nsops` (> 0) fornisce la dimensione di questo array. Gli elementi dell'array `sops` sono strutture della seguente forma:

{{<highlight c>}}
struct sembuf {
	unsigned short sem_num; /* Semaphore number */
	short sem_op; /* Operation to be performed */
	short sem_flg; /* Operation flags */
};
{{</highlight>}}

Il campo `sem_num` identifica il semaforo all'interno dell'insieme sul quale operazione deve essere eseguita. Il campo `sem_op` specifica l'operazione da essere eseguita:

* `sem_op > 0`: il valore del sem op viene aggiunto al valore del sem num-th semaforo.
* `sem_op = 0`: il valore del semaforo sem num-esimo viene controllato per vedere se è attualmente uguale a 0. Se non lo è, il processo chiamante è bloccato fino a quando il semaforo è 0.
* `sem_op < 0`: diminuisce il valore del semaforo sem num-th della quantità specificata in sem op. blocca il processo chiamante fino a quando il valore del semaforo è stato aumentato ad un livello che permette di eseguire l'operazione senza risultare in un valore negativo.

Quando una chiamata semop(...) si blocca, il processo rimane bloccato fino a quando seguenti eventi:
* Un altro processo modifica il valore del semaforo in modo che l'operazione l'operazione richiesta possa procedere.
* Un segnale interrompe la chiamata semop(...). In questo caso, l'errore EINTR risulta.
* Un altro processo cancella il semaforo a cui fa riferimento semid. In questo caso, semop(...) fallisce con l'errore `EIDRM`.

Possiamo evitare che semop(...) si blocchi quando esegue un'operazione su un particolare semaforo specificando il flag `IPC_NOWAIT` nel campo sem_flg corrispondente. In questo caso, se semop(...) si sarebbe bloccato, invece fallisce con l'errore `EAGAIN`.

{{<summary title="Esempio su come inizializzare un'array di operazioni sembuf">}}
{{<highlight c>}}
struct sembuf sops[3];
sops[0].sem_num = 0;
sops[0].sem_op = -1; // subtract 1 from semaphore 0
sops[0].sem_flg = 0;
sops[1].sem_num = 1;
sops[1].sem_op = 2; // add 2 to semaphore 1
sops[1].sem_flg = 0;
sops[2].sem_num = 2;
sops[2].sem_op = 0; // wait for semaphore 2 to equal 0
sops[2].sem_flg = IPC_NOWAIT; // but don’t block if operation cannot be
performed immediately
{{</highlight>}}
{{</summary>}}

{{<summary title="Esempio su come eseguire operazioni su un insieme di semafori">}}
{{<highlight c>}}
struct sembuf sops[3];
// .. see the previous slide to initilize sembuf
if (semop(semid, sops, 3) == -1) {
	if (errno == EAGAIN) // Semaphore 2 would have blocked
		printf("Operation would have blocked\n");
	else
		errExit("semop"); // Some other error
}
{{</highlight>}}
{{</summary>}}