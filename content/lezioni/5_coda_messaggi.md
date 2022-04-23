+++
title = "Lezione 5 - Memoria condivisa e coda di messaggi"
slug = "5-memoria-condivisa-coda-di-messaggi"
description = "Utilizzo della memoria condivisa tra i processi e introduzione alla coda di messaggi"
date = 2022-03-29
author = "SeekBytes"
+++

## Memoria condivisa

### Concetti fondamentali

Una memoria condivisa è un segmento di memoria fisica gestito dal Kernel, che permette a due o più processi di scambiarsi dati. Una volta collegata, anche più di una volta, la memoria condivisa fa parte dello spazio di indirizzamento virtuale del processo, e non è richiesto alcun intervento del kernel. I dati scritti in una memoria condivisa sono immediatamente disponibili a tutti gli altri processo che condividono lo stesso segmento. Tipicamente, qualche metodo di sincronizzazione è richiesto in modo che i processi non accedano simultaneamente accedere alla memoria condivisa (per esempio, semafori!).

### Creazione ed apertura (shmget)

La chiamata di sistema shmget crea un nuovo segmento di memoria condivisa o ottiene l'identificatore di uno esistente. Il contenuto di un segmento di memoria condivisa appena creato è inizializzato a 0.

{{<highlight c>}}
#include <sys/shm.h>

// Returns a shared memory segment identifier on success, or -1 on error
int shmget(key_t key, size_t size, int shmflg);
{{</highlight>}}

Gli argomenti chiave sono:
* una chiave IPC.
* `size` specifica la dimensione desiderata 1 del segmento, in byte.
* se stiamo usando shmget per ottenere l'identificatore di un segmento esistente, allora la dimensione non ha effetto sul segmento, ma deve essere minore o
uguale alla dimensione del segmento.

`shmflg` è una maschera di bit che specifica i permessi (vedere la chiamata di sistema `open(...)` di sistema, argomento mode) da porre su un nuovo segmento di memoria condivisa o controllati su un segmento esistente. In aggiunta, i seguenti flag possono essere ORed (|) in shmflg:
* IPC_CREAT: se non esiste alcun segmento con la chiave specificata, crea un nuovo segmento
* IPC_EXCL: in combinazione con IPC_CREAT, fa fallire shmget se un segmento esiste con la chiave specificata.

{{<summary title="Esempio di creazione di un segmento di memoria condiviso">}}
int shmid;
ket_t key = //... (generate a key in some way, i.e. with ftok)
size_t size = //... (compute size value in some way)
// A) delegate the problem of finding a unique key to the kernel
shmid = shmget(IPC_PRIVATE, size, S_IRUSR | S_IWUSR);
// B) create a shared memory with identifier key, if it doesn’t already exist
shmid = shmget(key, size, IPC_CREAT | S_IRUSR | S_IWUSR);
// C) create a shared memory with identifier key, but fail if it exists already
shmid = shmget(key, size, IPC_CREAT | IPC_EXCL | S_IRUSR | S_IWUSR);
{{</summary>}}

### Attaccare un segmento

La chiamata di sistema shmat attacca il segmento di memoria condivisa identificato da shmid allo spazio degli indirizzi virtuali del processo chiamante. 

{{<highlight c>}}
#include <sys/shm.h>
// Returns address at which shared memory is attached on success
// or (void *)-1 on error
void *shmat(int shmid, const void *shmaddr, int shmflg);
{{</highlight>}}


* `shmaddr NULL`: il segmento è attaccato ad un indirizzo adatto selezionato dal kernel (`shmaddr` e `shmflg` sono ignorati)
* `shmaddr` non `NULL`: il segmento è attaccato all'indirizzo shmaddr
* `shmflg SHM_RND`: shmaddr viene arrotondato per difetto al più vicino multiplo di della costante SHMLBA (indirizzo di confine basso della memoria condivisa)

Normalmente, shmaddr è NULL, per le seguenti ragioni: 
* Aumenta la portabilità di un'applicazione. Un indirizzo valido su un'implementazione UNIX può essere non valido su un'altra.
* Un tentativo di collegare un segmento di memoria condivisa ad un particolare indirizzo fallirà se quell'indirizzo è già in uso.
In aggiunta a SHM_RND, il flag SHM_RDONLY può essere specificato per allegare una memoria condivisa per la sola lettura. Se shmflg ha valore zero, la memoria condivisa è collegata in modalità lettura e scrittura.

Un processo figlio eredita i segmenti di memoria condivisa del suo genitore. La memoria condivisa fornisce un facile metodo di IPC tra genitore e figlio!

{{<summary title="Esempio di come attaccare un segmento di memoria condivisa">}}
{{<highlight c>}}
// attach the shared memory in read/write mode
int *ptr_1 = (int *)shmat(shmid, NULL, 0);
// attach the shared memory in read only mode
int *ptr_2 = (int *)shmat(shmid, NULL, SHM_RDONLY);
// N.B. ptr_1 and ptr_2 are different!
// But they refer to the same shared memory!
// write 10 integers to shared memory segment
for (int i = 0; i < 10; ++i)
ptr_1[i] = i;
// read 10 integers from shared memory segment
for (int i = 0; i < 10; ++i)
printf("integer: %d\n", ptr_2[i]);
{{</highlight>}}

Che cosa stamperà il programma? Possiamo utilizzare `ptr_2` per scrivere sul segmento della memoria? (Spoiler: no).
{{</summary>}}

### Shmdt

Quando un processo non ha più bisogno di accedere ad un segmento di memoria condivisa, può chiamare shmdt per staccare il segmento dal suo spazio di indirizzo virtuale. L'argomento shmaddr identifica il segmento da staccare, ed è un valore restituito da una precedente chiamata a shmat.

{{<highlight c>}}
#include <sys/shm.h>
// Returns 0 on success, or -1 on error
int shmdt(const void *shmaddr);
{{</highlight>}}

Durante un exec, tutti i segmenti di memoria condivisa collegati sono staccati. I segmenti di memoria condivisa sono anche distaccati automaticamente alla terminare.

{{<summary title="Esempio di come staccare un segmento di memoria condivisa">}}
{{<highlight c>}}
// attach the shared memory in read/write mode
int *ptr_1 = (int *)shmat(shmid, NULL, 0);
if (ptr_1 == (void *)-1)
errExit("first shmat failed");
// attach the shared memory in read only mode
int *ptr_2 = (int *)shmat(shmid, NULL, SHM_RDONLY);
if (ptr_2 == (void *)-1)
errExit("second shmat failed");
//...
// detach the shared memory segments
if (shmdt(ptr_1) == -1 || shmdt(ptr_2) == -1)
errExit("shmdt failed");
{{</highlight>}}
{{</summary>}}

### shmctl

La chiamata di sistema shmctl esegue operazioni di controllo su un segmento di memoria condivisa.

{{<highlight c>}}
#include <sys/msg.h>
// Returns 0 on success, or -1 error
int shmctl(int shmid, int cmd, struct shmid_ds *buf);
{{</highlight>}}

L'argomento shmid è un identificatore di memoria condivisa. L'argomento cmd specifica l'operazione da eseguire sulla memoria condivisa:
* `IPC_RMID`: Segna per la cancellazione la memoria condivisa. Il segmento viene rimosso non appena tutti i processi si sono staccati da esso
* `IPC_STAT`: posiziona una copia della struttura dati shmid ds associata a questa memoria condivisa nel buffer indicato da buf
* `IPC_SET`: Aggiorna i campi selezionati della struttura dati shmid ds associata a questa memoria condivisa utilizzando i valori forniti nel buffer indicato da buf.

{{<summary title="Rimuovere un segmento di memoria condivisa">}}
{{<highlight c>}}
if (shmctl(shmid, IPC_RMID, NULL) == -1)
	errExit("shmctl failed");
else
	printf("shared memory segment removed successfully\n");
{{</highlight>}}
{{</summary>}}

#### Operazioni di controllo

Per ogni segmento di memoria condivisa il kernel ha una struttura dati associata s`hmid_ds` della seguente forma:

{{<highlight c>}}
struct shmid_ds {
	struct ipc_perm shm_perm; /* Ownership and permissions */
	size_t shm_segsz; /* Size of segment in bytes */
	time_t shm_atime; /* Time of last shmat() */
	time_t shm_dtime; /* Time of last shmdt() */
	time_t shm_ctime; /* Time of last change */
	pid_t shm_cpid; /* PID of creator */
	pid_t shm_lpid; /* PID of last shmat() / shmdt() */
	shmatt_t shm_nattch; // Number of currently attached
}; // processes
{{</highlight>}}

Con `IPC_STAT` e `IPC_SET` possiamo rispettivamente ottenere e aggiornare questa struttura di dati.

## Coda messaggi

### Creazione e apertura

La system call `msgget` crea una coda di messaggi oppure ottiene l'identificatore di una coda già esistente.

{{<highlight c>}}
#include <sys/msg.h>
// Returns message queue identifier on success, or -1 error
int msgget(key_t key, int msgflg);
{{</highlight>}}

L'argomento `key` è una chiave IPC, msgflg è una maschera di bit che specifica i permessi (vedi la chiamata di sistema open(...), argomento mode) da inserire in una nuova coda di messaggi, o da controllare in una coda esistente. In aggiunta, i seguenti flag possono essere ORed (|) in msgflg:
* `IPC_CREAT`: se non esiste una coda di messaggi con la chiave specificata, crea una nuova coda
* `IPC_EXCL`: in combinazione con `IPC_CREAT`, fa fallire msgget se esiste una coda con la chiave specificata

{{<summary title="Esempio per creare una coda di messaggi">}}
int msqid;
ket_t key = //... (generate a key in some way, i.e. with ftok)
// A) delegate the problem of finding a unique key to the kernel
msqid = msgget(IPC_PRIVATE, S_IRUSR | S_IWUSR);
// B) create a queue with identifier key, if it doesn’t already exist
msqid = msgget(key, IPC_CREAT | S_IRUSR | S_IWUSR);
// C) create a queue with identifier key, but fail if it exists already
msqid = msgget(key, IPC_CREAT | IPC_EXCL | S_IRUSR | S_IWUSR);
{{</summary>}}

### Struttura dei messaggi

Un messaggio in una coda di messaggi segue sempre la seguente struttura:
{{<highlight c>}}
struct mymsg {
	long mtype; /* Tipo di messaggio */
	char mtext[]; /* corpo del messaggio */
};
{{</highlight>}}

La prima parte di un messaggio contiene il tipo di messaggio, specificato come un intero lungo maggiore di 0. Il resto del messaggio è una struttura definita dal programmatore di lunghezza e contenuto arbitrari (non è necessariamente un array di char). Infatti, può essere omesso se non è necessario.

### Inviare un messaggio (msgsnd)

La chiamata di sistema msgsnd scrive un messaggio in una coda di messaggi.

{{<highlight c>}}
#include <sys/msg.h>
// Returns 0 on success, or -1 error
int msgsnd(int msqid, const void *msgp, size_t msgsz, int msgflg);
{{</highlight>}}

* l'argomento msqid è un identificatore di coda di messaggi
* msgp è un indirizzo che punta a una struttura di messaggio
* msgsz specifica il numero di byte contenuti nel campo mtext di del messaggio
* l'argomento msgflg può essere 0, o il flag IPC NOWAIT.
	* Normalmente, se una coda di messaggi è piena, msgsnd si blocca fino a quando non diventa disponibile abbastanza spazio per permettere al messaggio di essere messo in coda. Se viene specificato `IPC_NOWAIT`, `msgsnd` ritorna immediatamente con l'errore `EAGAIN` (cioè, non ci sono dati disponibili in questo momento, riprova più tardi).

{{<summary title="Esempio di invio messaggio">}}
{{<highlight c>}}
// Message structure
struct mymsg {
	long mtype;
	char mtext[100]; /* array of chars as message body */
} m;
// message has type 1
m.mtype = 1;
// message contains the following string
char *text = "Ciao mondo!";
memcpy(m.mtext, text, strlen(text) + 1); // why +1 here?
// size of m is only the size of its mtext attribute!
size_t mSize = sizeof(struct mymsg) - sizeof(long);
// sending the message in the queue
if (msgsnd(msqid, &m, mSize, 0) == -1)
	errExit("msgsnd failed");
{{</highlight>}}
{{</summary>}}

{{<summary title="Esempio di invio messaggio 2">}}
{{<highlight c>}}
// Message structure
struct mymsg {
	long mtype;
	int num1, num2; /* two integers as message body */
} m;
// message has type 2
m.mtype = 2;
// message contains the following numbers
m.num1 = 34;
m.num2 = 43;
// size of m is only the size of its mtext attribute!
size_t mSize = sizeof(struct mymsg) - sizeof(long);
// sending the message in the queue
if (msgsnd(msqid, &m, mSize, 0) == -1)
	errExit("msgsnd failed");
{{</highlight>}}
{{</summary>}}

{{<summary title="Esempio di invio messaggio senza body">}}
{{<highlight c>}}
// Message structure
struct mymsg {
	long mtype;
	/* The message has not got body. It has just a type!*/
} m;
// message has type 3
m.mtype = 3;
// size of m is only the size of its mtext attribute!
size_t mSize = sizeof(struct mymsg) - sizeof(long); // 0!
// sending the message in the queue
if (msgsnd(msqid, &m, mSize, IPC_NOWAIT) == -1) {
if (errno == EAGAIN) {
printf("The queue was full!\n");
} else {
errExit("msgsnd failed");
}
}
{{</highlight>}}
{{</summary>}}

### Ricevere un messaggio (msgrcv)

La chiamata di sistema msgrcv legge e rimuove un messaggio da una coda.

{{<highlight c>}}
#include <sys/msg.h>
// Returns number of bytes copied into msgp on success, or -1 error
ssize_t msgrcv(int msqid, void *msgp, size_t msgsz, long msgtype, int msgflg);
{{</highlight>}}

L'argomento `msqid` è un identificatore di coda di messaggi. Lo spazio massimo disponibile nel campo mtext del buffer msgp è specificato dall'argomento msgsz.

Il valore nel campo `msgtype` seleziona il messaggio recuperato come segue:
* se uguale a 0, il primo messaggio dalla coda viene rimosso e restituito al processo chiamante.
* se maggiore di 0, il primo messaggio dalla coda che ha mtype uguale a msgtype viene rimosso e restituito al processo chiamante.
* se inferiore a 0, il primo messaggio del tipo m più basso inferiore o uguale al valore assoluto di msgtype viene rimosso e restituito al processo chiamante.

Data la definizione del messaggio: (mtype, char) e la seguente coda:
{(300,'a'); (100,'b'); (200,'c'); (400,'d'); (100,'e')}
Una serie di chiamate msgrcv con msgtype=-300 recupera i messaggi:
(100,'b'), (100,'e'), (200,'c'), (300,'a')

L'argomento msgflg è una maschera di bit formata da OR insieme a zero o più dei seguenti flag:
* `IPC_NOWAIT`: Per impostazione predefinita, se nessun messaggio corrispondente a msgtype è nella coda, msgrcv si blocca fino a quando un tale messaggio diventa disponibile. Specificando il flag `IPC_NOWAIT`, msgrcv ritorna immediatamente con l'errore ENOMSG.
* `MSG_NOERROR`: Per default, se la dimensione del campo mtext del messaggio supera lo spazio disponibile (come definito dall'argomento msgsz), msgrcv fallisce. Se viene specificato il flag `MSG_NOERROR`, allora msgrcv rimuove invece il messaggio dalla coda, tronca il suo campo mtext a msgsz bytes, e lo restituisce al chiamante.

{{<summary title="Esempio 1">}}
{{<highlight c>}}
// message structure definition
struct mymsg {
	long mtype;
	char mtext[100]; /* array of chars as message body */
} m;
// Get the size of the mtext field.
size_t mSize = sizeof(struct mymsg) - sizeof(long);
// Wait for a message having type equals to 1
if (msgrcv(msqid, &m, mSize, 1, 0) == -1)
	errExit("msgrcv failed");
{{</highlight>}}
{{</summary>}}

{{<summary title="Esempio 2">}}
{{<highlight c>}}
// message structure definition
struct mymsg {
	long mtype;
	char mtext[100]; /* array of chars as message body */
} m;
// Set an arbitrary size for the size.
size_t mSize = sizeof(char) * 50;
// Wait for a message having type equals to 1, but copy its first 50 bytes only
if (msgrcv(msqid, &m, mSize, 1, MSG_NOERROR) == -1)
	errExit("msgrcv failed");
{{</highlight>}}
{{</summary>}}

{{<summary title="Esempio 3">}}
{{<highlight c>}}
// Message structure
struct mymsg {
	long mtype;
} m;
// In polling mode, try to get a message every SEC seconds.
while (1) {
	sleep(SEC);
	// Performing a nonblocking msgrcv.
	if (msgrcv(msqid, &m, 0, 3, IPC_NOWAIT) == -1) {
		if (errno == ENOMSG) {
			printf("No message with type 3 in the queue\n");
		} else {
			errExit("msgrcv failed");
		}
	} else {
	printf("I found a message with type 3\n");
	}
}
{{</highlight>}}
{{</summary>}}

### Operazioni di controllo msgctl

La chiamata di sistema msgctl esegue operazioni di controllo sulla coda dei messaggi.

{{<highlight c>}}
#include <sys/msg.h>
// Returns 0 on success, or -1 error
int msgctl(int msqid, int cmd, struct msqid_ds *buf);
{{</highlight>}}

* `msqid` è un identificatore di coda di messaggi.
* `cmd` specifica l'operazione da eseguire sulla coda: 
	* `IPC_RMID`: rimuove immediatamente la coda di messaggi. Tutti i messaggi non letti vengono persi, e qualsiasi lettore/scrittore bloccato viene risvegliato (errno impostato a EIDRM). Per questa operazione, buf viene ignorato. 
	* `IPC_STAT`: Posiziona una copia della struttura dati msqid ds associata a questa coda di messaggi nel buffer indicato da buf 
	* `IPC_SET`: Aggiorna campi selezionati della struttura dati msqid ds associata a questa coda di messaggi usando valori forniti nel buffer indicato da buf

{{<summary title="Esempio su come rimuovere una coda di messaggi">}}
{{<highlight c>}}
if (msgctl(msqid, IPC_RMID, NULL) == -1)
	errExit("msgctl failed");
else
	printf("message queue removed successfully\n");
{{</highlight>}}
{{</summary>}}

### Struttura msqid_ds

Per ogni coda di messaggi, il kernel ha associato una struttura chiamata `msqid_ds` della seguente forma:

{{<highlight c>}}
struct msqid_ds {
	struct ipc_perm msg_perm; /* Ownership and permissions */
	time_t msg_stime; /* Time of last msgsnd() */
	time_t msg_rtime; /* Time of last msgrcv() */
	time_t msg_ctime; /* Time of last change */
	unsigned long __msg_cbytes; /* Number of bytes in queue */
	msgqnum_t msg_qnum; /* Number of messages in queue */
	msglen_t msg_qbytes; /* Maximum bytes in queue */
	pid_t msg_lspid; /* PID of last msgsnd() */
	pid_t msg_lrpid; /* PID of last msgrcv() */
};
{{</highlight>}}

Con `IPC_STAT` e `IPC_SET` possiamo rispettivamente ottenere e aggiornare
questa struttura di dati.

{{<summary title="Esempio su come cambiare i limiti di dimensione di una message queue">}}
struct msqid_ds ds;
// Get the data structure of a message queue
if (msgctl(msqid, IPC_STAT, &ds) == -1)
	errExit("msgctl");

// Change the upper limit on the number of bytes in the mtext
// fields of all messages in the message queue to 1 Kbyte
ds.msg_qbytes = 1024;

// Update associated data structure in kernel
if (msgctl(msqid, IPC_SET, &ds) == -1)
	errExit("msgctl");
{{</summary>}}

## Visione conclusiva delle interfacce System V

Interfaccia | Coda di messaggi | Semafori | Memoria condivisa
-- | -- | -- | --
File header | `<sys/msg.h>` | `<sys/sem.h>` | `<sys/shm.h>`
Struttura dati | msqid_ds | semid_ds | shmid_ds
Creare/Apertura | msgget(..) | semget(..) | shmget(...)
Close | nessuna | nessuna | shmdt(..)
Operazioni di controllo | msgctl(..) | semctl(..) | shmctl(..)
Fare operazioni di IPC | msgsnd(..) msgrcv(...) | semop() per aggiustare i valori | accesso diretto alla memoria condivisa