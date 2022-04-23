+++
title = "Lezione 6 - Pipe e FIFO"
slug = "6-pipe-fifo"
author = "SeekBytes"
date = 2022-04-05
+++

## Concetti fondamentali

Una PIPE è un flusso di dati in byte che permette a processi di scambiare byte. Tecnicalmente parlando è un buffer nella memoria del kernel. Una PIPE ha le seguenti proprietà:

* è unidirezionale. I dati viaggiano solo in una direzione. Un'estremità di una PIPE è utilizzata per scrivere, l'altra per leggere.

* i dati passano dalla PIPE in modo sequenziale. I byte sono letti da una PIPE nell'esatto ordine in cui sono stati scritti.

* nessun concetto/astrazione di messaggi. Il processo che legge da una PIPE può leggere blocchi di dati di tutti i tipi, non curandosi della dimensione dei blocchi del processo scrivente.

* il tentativo di leggere da una PIPE vuota blocca il lettore finché almeno un byte è stato scritto nella PIPE oppure un segnale viene ricevuto (terminando con EINTR).

* Se l'estremità in cui si scrive è chiusa, allora un processo che legge dalla PIPe vedrà un end-of-file quando ha letto tutti i dati sulla PIPE.

* Un'operazione di scrittura è bloccata fino a quando:
	* esiste altro spazio disponibile
	* un segnale viene ricevuto

* Operazioni di scrittura più larghi della PIPE_BUF bytes potrebbero essere divisi in segmenti di dimensioni arbitrarie

### Creazione e apertura pipe

La system call `pipe` crea una nuova PIPE. 

{{<highlight c>}}
#include <unistd.h>

// Returns 0 on success, or -1 on error
int pipe(int filedes[2]);
{{</highlight>}}

Una chiamata riuscita a pipe restituisce due descrittori di file aperti nell'array
filedes.

* `filedes[0]` memorizza la fine della lettura del PIPE.
* `filedes[1]` memorizza l'estremità di scrittura del PIPE.
Come con qualsiasi descrittore di file, possiamo usare le chiamate di sistema read e write per eseguire I/O sul PIPE.
Normalmente, usiamo un PIPE per permettere la comunicazione tra processi correlati. Per collegare due processi usando un PIPE, seguiamo la chiamata pipe con una chiamata a `fork`.

{{<summary title="Creazione di una PIPE - esempio 1">}}
{{<highlight c>}}
int fd[2];
// checking if PIPE successed
if (pipe(fd) == -1)
	errExit("PIPE");
// Create a child process
switch(fork()) {
	case -1:
		errExit("fork");
	case 0: // Child
		//...child reads from PIPE
		break;
	default: // Parent
		//...parent writes to PIPE
		break;
}
{{</highlight>}}

1. Pipe crea una nuova PIPE. fd[0] è l'estremità per la lettura, f[1] è l'estremità per la scrittura. 

2. `fork()` crea un processo figlio che eredita la file descriptor table dal processo genitore.

<h4>Processo figlio</h4>
{{<highlight c>}}
char buf[SIZE];
ssize_t nBys;
// close unused write-end
if (close(fd[1]) == -1)
	errExit("close - child");
// reading from the PIPE
nBys = read(fd[0], buf, SIZE);
// 0: end-of-file, -1: failure
if (nBys > 0) {
	buf[nBys] = ’\0’;
	printf("%s\n", buf);
}
// close read-end of PIPE
if (close(fd[0]) == -1)
	errExit("close - child");
{{</highlight>}}

<h4>Processo parent</h4>
{{<highlight c>}}
char buf[] = "Ciao Mondo\n";
ssize_t nBys;
// close unused read-end
if (close(fd[0]) == -1)
	errExit("close - parent");
// write to the PIPE
nBys = write(fd[1], buf, strlen(buf));
// checkig if write successed
if (nBys != strlen(buf)) {
	errExit("write - parent");
}
// close write-end of PIPE
if (close(fd[1]) == -1)
	errExit("close - child");
{{</highlight>}}
{{</summary>}}

## Buone pratiche

Perché dovremo chiudere i file descriptor non utilizzzati? Che problema potremo avere?

{{<summary title="Esempio su come utilizzare le PIPE IN MODO SBAGLIATO 1">}}
Processo figlio:
{{<highlight c>}}
// close unused write-end
//if (close(fd[1]) == -1)
// errExit("close - child");
char buf[SIZE];
ssize_t nBys;
// reading from the PIPE
nBys = read(fd[0], buf, SIZE);
// 0: end-of-file, -1: failure
if (nBys > 0)
printf("%s\n", buf);
// close read-end of PIPE
if (close(fd[0]) == -1)
errExit("close - child");
{{</highlight>}}

Processo padre:
{{<highlight c>}}
// close unused read-end
if (close(fd[0]) == -1)
errExit("close - parent");
// ...nothing to send
// close write-end of PIPE
if (close(fd[1]) == -1)
errExit("close - child");
{{</highlight>}}

Perché questo programma è sbagliato? Il processo in lettura sta aspettando dati.
{{</summary>}}

{{<summary title="Esempio su come utilizzare le PIPE IN MODO SBAGLIATO 2">}}
{{<highlight c>}}
// close unused write-end
if (close(fd[1]) == -1)
	errExit("close - child");

// ...nothing to read

// close read-end of PIPE
if (close(fd[0]) == -1)
	errExit("close - child");
{{</highlight>}}
{{<highlight c>}}
// close unused read-end
//if (close(fd[0]) == -1)
// errExit("close - parent");
char buf[] = "Ciao Mondo\n";
size_t len = strlen(buf);
// write to the PIPE
nBys = write(fd[1], buf, len);
// checkig if write successed
if (nBys != len)
	errExit("write - parent");
// close write-end of PIPE
if (close(fd[1]) == -1)
	errExit("close - child");
{{</highlight>}}

Perché questo programma è sbagliato? Il programma che scrive a chi sta inviando i dati?
{{</summary>}}

## FIFO

Una FIFO è un flusso di byte che permette ai processi di scambiare informazioni. Tecnicalmente parlando è un buffer nella memoria del kernel. Semanticamente, una FIFO è simile ad una PIPE.

La principale differenza tra una PIPE e una FIFO è che la FIFO ha un nome all'interno del file system, è aperta ed eliminata allo stesso modo di un file. Questo consente ad una FIFO di essere utilizzata per la comunicazione **tra processi che non condividono alcuna relazione**.

Come le PIPE, anche le FIFO hanno un'estremità per leggere e per scrivere, i dati sono letti dalle FIFO nello stesso ordine in cui sono stati scritti.

## Creazione ed apertura di una FIFO

La system call `mkfifo` crea una nuova FIFO.

{{<highlight c>}}
#include <unistd.h>

// Returns 0 on success, or -1 on error
int mkfifo(const char *pathname, mode_t mode);
{{</highlight>}}

Il parametro pathname specifica dove la FIFO è aperta. Come per un normale file, il parametro mode specifica i permessi della FIFO (vedi [prima lezione](/lezioni/1-b-file-system/)). Una volta che la FIFO è stata creata, qualsiasi processo può aprirla.

### Open per le FIFO

La system call open apre una FIFO.

{{<highlight c>}}
#include <unistd.h>

// Returns file descriptor on success, or -1 on error.
int open(const char *pathname, int flags);
{{</highlight>}}

Il parametro pathname specifica la posizione del FIFO nel file system. L'argomento flags è una maschera di bit di una delle seguenti costanti che specificano la modalità di accesso per il FIFO.

Flag | Descrizione
-- | --
O_RDONLY | Apre in sola lettura
O_WRONLY | Apre in sola scrittura

L'unico uso sensato di un FIFO è quello di avere un processo di lettura e uno di scrittura su ogni estremità. Per impostazione predefinita, l'apertura di una FIFO per la lettura (flag `O_RDONLY`) blocca finché un altro processo non apre la FIFO per la scrittura (flag `O_WRONLY`). Al contrario, l'apertura del FIFO per la scrittura blocca finché un altro processo apre la FIFO per la lettura. In altre parole, l'apertura di una FIFO sincronizza i processi di lettura e scrittura. Se l'estremità opposta di una FIFO è già aperta (forse perché una coppia di processi ha già aperto ciascuna estremità della FIFO), allora l'apertura ha successo immediatamente.

{{<summary title="Esempio FIFO e sincronizzazione">}}
<h4>Receiver</h4>
{{<highlight c>}}
char *fname = "/tmp/myfifo";
int res = mkfifo(fname, S_IRUSR|S_IWUSR);
// Opening for reading only
int fd = open(fname, O_RDONLY);
// reading bytes from fifo
char buffer[LEN];
read(fd, buffer, LEN);
// Printing buffer on stdout
printf("%s\n", buffer);
// closing the fifo
close(fd);
// Removing FIFO
unlink(fname);
{{</highlight>}}

<h4>Sender</h4>
{{<highlight c>}}
char *fname = "/tmp/myfifo";
// Opening for wringing only
int fd = open(fname, O_WRONLY);
//reading a str. (no spaces)
char buffer[LEN];
printf("Give me a string: ");
scanf("%s", buffer);
// writing the string on fifo
write(fd, buffer, strlen(buffer));
// closing the fifo
close(fd);
{{</highlight>}}
{{</summary>}}