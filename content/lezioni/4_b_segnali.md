+++
title = "Lezione 4.B - IPC e Segnali"
slug = "4-b-segnali-ipc"
date = 2022-01-10
description = "Introduzione ai segnali (inviare un segnale, gestire un segnale)."
author = "SeekBytes"
syscall = ["signal", "pause", "sleep", "kill", "alarm", "sigemptyset", "sigfillset", "sigaddset", "sigismember", "sigprocmask"]
+++

## Concetti fondamentali

Un segnale è una notifica a un processo che si è verificato un evento. Essi interrompono il normale flusso di esecuzione di un programma; nella maggior parte dei casi, non è possibile prevedere esattamente quando un segnale arriverà.

Si dice che un segnale sia generato da qualche evento. Una volta generato, un segnale viene successivamente consegnato ad un processo. Tra il momento in cui viene generato e il momento in cui viene consegnato, si dice che un segnale è in sospeso. Normalmente, un segnale in sospeso viene consegnato ad un processo non appena è programmato per essere eseguito, o immediatamente se il processo è già in esecuzione.

Alla consegna di un segnale, un processo esegue una delle seguenti azioni predefinite, a seconda del segnale: 
* Il processo viene terminato (ucciso).
* Il processo viene sospeso (fermato).
* Il processo viene ripreso dopo essere stato precedentemente fermato.
* Il segnale viene ignorato. Viene scartato dal kernel e non ha alcun effetto sul processo. Il processo esegue un gestore di segnale, cioè una funzione scritta dal programmatore che esegue compiti appropriati in risposta alla consegna di un segnale.

## Tipi di segnali

Segnali per terminare un processo: 
* `SIGTERM` viene consegnato per terminare in modo sicuro un processo. Un'applicazione ben progettata applicazione dovrebbe avere un gestore per `SIGTERM` che causa l'uscita l'applicazione ad uscire con grazia.
* `SIGINT` termina un processo ("interrupt process"). Viene inviato quando l'utente digita il carattere Control-C.
* `SIGQUIT` termina un processo e lo induce a produrre un core dump, che può essere usato per il debug.
* `SIGKILL` termina un processo (sempre!). Non può essere bloccato, ignorato, o catturato da un gestore.

Segnali per stoppare e riesumare un processo:

* `SIGSTOP` ferma un processo (sempre!). Non può essere bloccato, ignorato o catturato da un gestore.
* `SIGCONT` riprende un processo precedentemente fermato.

Altri segnali:

* `SIGPIPE` viene generato quando un processo cerca di scrivere su un PIPE, un FIFO per il quale non esiste un processo lettore corrispondente (vedi capitolo PIPE/FIFO).
* `SIGALRM` viene consegnato a un processo allo scadere di un timer in tempo reale impostato da una chiamata all'allarme (vedere le prossime diapositive).
* `SIGUSR1` e `SIGUSR2` sono disponibili per scopi definiti dal programmatore. Il kernel non genera mai questi segnali per un processo. 

La lista completa dei segnali disponibili in Linux può essere recuperata con il comando bash "man 7 signal".

Nome | Numero | Può essere gestito? | Azione di default
-- | -- | -- | --
`SIGTERM` | 15 | Sì | termina un processo
`SIGINT` | 2 | Sì | termina un processo
`SIGQUIT` | 3 | Sì | Dump di un processo e termina un processo
`SIGKILL` | 9 | **no** | Termina un processo
`SIGSTOP` | 17 | **no** | Ferma un processo
`SIGCONT` | 19 | Sì | Riesuma un processo che era stato fermato
`SIGPIPE` | 13 | Sì | Termina un processo
`SIGALRM` | 14 | Sì | Termina un processo
`SIGUSR1` | 30 | Sì | Termina un processo
`SIGUSR2` | 31 | Sì | Termina un processo

## Gestione di una Signal

Un gestore di segnali (chiamato anche "catturatore" di segnali) è una funzione che viene chiamata quando un segnale specificato viene consegnato ad un processo. Ha sempre la seguente forma generale:

{{<highlight c>}}
void sigHandler(int sig) {
	/* Code for the handler */
}
{{</highlight>}}

Questa funzione non restituisce nulla (void) e prende un argomento intero (`sig`). Quando il gestore del segnale è invocato dal kernel, `sig` è impostato al segnale consegnato al processo. Tipicamente, `sig` è usato per determinare quale segnale ha causato l'invocazione del gestore invocato quando uno stesso gestore cattura diversi tipi di segnali.

L'invocazione di un gestore di segnali può interrompere il flusso del programma principale in qualsiasi momento. Il kernel chiama il gestore del segnale, e quando il gestore ritorna, l'esecuzione del programma riprende dal punto in cui il gestore l'ha interrotta.

### Signal

La chiamata di sistema `signal()` cambia il signal-handler predefinito per un segnale definito in un processo.

{{<highlight c>}}
#include <signal.h>

typedef void (*sighandler_t)(int);
// Returns previous signal disposition on success, or SIG_ERR on error
sighandler_t signal(int signum, sighandler_t handler);
{{</highlight>}}

`signum` identifica il segnale di cui vogliamo cambiare la disposizione nel processo. `handler` può essere uno dei seguenti:
* l'indirizzo di un gestore di segnale definito dall'utente.
* la costante `SIG_DFL`, che reimposta la disposizione predefinita del processo per il segnale signum.
* la costante `SIG_IGN`, che imposta il processo a ignorare la consegna del segnale signum.

{{<summary title="Esempio di come catturare i segnali">}}
{{<highlight c>}}
void sigHandler(int sig) {
	printf("The signal %s was caught!\n",
	(sig == SIGINT)? "Ctrl-C" : "signal User-1");
}
int main (int argc, char *argv[]) {
	// setting sigHandler to be executed for SIGINT or SIGUSR1
	if (signal(SIGINT, sigHandler) == SIG_ERR ||
	signal(SIGUSR1, sigHandler) == SIG_ERR) {
		errExit("change signal handler failed");
	}
	// Do something else here. During this time, if SIGINT/SIGUSR1
	// is delivered, sigHandler will be used to handle the signal.
	// Reset the default process disposition for SIGINT and SIGUSR1
	if (signal(SIGINT, SIG_DFL) == SIG_ERR ||
	signal(SIGUSR1, SIG_DFL) == SIG_ERR) {
		errExit("reset signal handler failed");
	}
	return 0;
}
{{</highlight>}}
{{</summary>}}

Cose da tenere a mente quando si utilizzano signal handlers:

* `SIGKILL` e `SIGSTOP` non possono essere catturati.
* Un segnale è un evento asincrono. Non possiamo prevedere quando arriva.
* Quando un gestore di segnali viene invocato, il segnale che ha causato la sua invocazione è automaticamente bloccato. Viene sbloccato quando il gestore del segnale ritorna al normale flusso di esecuzione del programma.
* Se un segnale bloccato viene generato più volte, quando viene sbloccato, viene consegnato al processo solo una volta!
* L'esecuzione di un gestore di segnali può essere interrotta dalla consegna di un segnale non bloccato.
* Le disposizioni dei segnali sono ereditate tra processo padre e processo figlio.

### Pause

Chiamando pause si sospende l'esecuzione del processo finché la chiamata non viene interrotta da un gestore di segnale (o fino a quando un segnale non gestito termina il processo).

{{<highlight c>}}
#include <unistd.h>
// Always return -1 with errno set to EINTR
int pause();
{{</highlight>}}

### Sleep

La funzione sleep sospende l'esecuzione del processo chiamante per il numero di secondi specificato nell'argomento `seconds` o fino a quando un segnale viene catturato (interrompendo così la chiamata).

{{<highlight c>}}
#include <unistd.h>
unsigned int sleep(unsigned int seconds); // Returns 0 on normal completion, or number of unslept seconds if prematurely terminated
{{</highlight>}}

{{<summary title="Esempio di waiting di un segnale">}}
{{<highlight c>}}
void sigHandler(int sig) { 
	printf("Well done!\n"); 
}

int main (int argc, char *argv[]) {
	if (signal(SIGINT, sigHandler) == SIG_ERR)
		errExit("change signal handler failed");
	int time = 30;
	printf("We can wait for %d seconds!\n", time);
	time = sleep(time); // the process is suspended for max. 30sec.
	printf("%s!\n", (time==0)? "out of time", "just in time");
}
{{</highlight>}}
{{</summary>}}

### Mandare un segnale (kill)

La system call kill manda un segnale ad un altro processo. 

{{<highlight c>}}
#include <signal.h>
// Returns 0 on success, or -1 on error
int kill(pid_t pid, int sig);
{{</highlight>}}

L'argomento pid identifica uno o più processi a cui il segnale specificato da sig deve essere inviato.

* (pid > 0): il segnale viene inviato al processo con PID uguale a pid.
* (pid = 0): il segnale viene inviato ad ogni processo nello stesso gruppo di processi del processo chiamante, incluso il processo chiamante stesso.
* (pid < 0): il segnale viene inviato a tutti i processi nel gruppo di processi il cui ID è uguale al valore assoluto di pid.
* (pid = -1): il segnale viene inviato ad ogni processo per il quale il processo chiamante ha il permesso di inviare un segnale, eccetto init e il processo
stesso.

{{<summary title="Inviare un segnale SIGKILL ad un processo figlio">}}
int main (int argc, char *argv[]) {
	pid_t child = fork();
	switch(child) {
	case -1:
		errExit("fork");
	case 0: /* Child process */
		while(1); // <- child is stuck here!
	default: /* Parent process */
		sleep(10); // wait 10 seconds
		kill(child, SIGKILL); // kill the child process
	}
	return 0;
}
{{</summary>}}

### Alarm

La chiamata al sistema di allarme fa in modo che un segnale `SIGALRM` sia consegnato al al processo chiamante dopo un ritardo fisso. 

{{<highlight c>}}
#include <signal.h>

// Always succeeds, returning number of seconds remaining on
// any previously set timer, or 0 if no timer previously was set
unsigned int alarm(unsigned int seconds);
{{</highlight>}}

L'argomento seconds specifica il numero di secondi nel futuro in cui il timer deve scadere. In quel momento, un segnale SIGALRM viene consegnato al processo chiamante. L'impostazione di un timer con allarme sovrascrive qualsiasi timer precedentemente impostato.

{{<summary title="Impostare un timer con la syscall alarm">}}
void sigHandler(int sig) { printf("Out of time!\n"); _exit(0); }

int main (int argc, char *argv[]) {
	if (signal(SIGALRM, sigHandler) == SIG_ERR)
		errExit("change signal handler failed");

	int time = 30;
	printf("We have %d seconds to complete the job!\n", time);
	alarm(time); // setting a timer

	/* Do something else here. */
	time = alarm(0); // disabling timer
	printf("%s seconds before timer expirations!\n", time);
	return 0;
}
{{</summary>}}

## Impostare o bloccare un segnale

### Set di segnali (sigemptyset e sigfillset)

Il tipo di dati sigset t rappresenta un insieme di segnali. Le funzioni `sigemptyset` e `sigfillet` devono essere utilizzate per inizializzare un insieme di segnali, prima di utilizzarlo in qualsiasi altro modo.

{{<highlight c>}}
#include <signal.h>

typedef unsigned long sigset_t;
// Both return 0 on success, or -1 on error.
int sigemptyset(sigset_t *set);
int sigfillset(sigset_t *set);
{{</highlight>}}

`sigemptyset` inizializza un insieme di segnali per non contenere alcun segnale.
`sigfillset` inizializza un insieme per contenere tutti i segnali.

### Sigaddset e Sigdelset

Dopo l'inizializzazione, i singoli segnali possono essere aggiunti a un insieme usando `sigaddset` e rimossi usando `sigdelset`.

{{<highlight c>}}
#include <signal.h>

// Both return 0 on success, or -1 on error
int sigaddset(sigset_t *set, int sig);
int sigdelset(sigset_t *set, int sig);
{{</highlight>}}

Sia per `sigaddset` che per `sigdelset`, l'argomento sig è un numero di segnale. La funzione sigismember è utilizzata per verificare l'appartenenza ad un insieme.

{{<highlight c>}}
#include <signal.h>
// Restituisce 1 se sig è un membro di set, altrimenti 0
int sigismember(const sigset_t *set, int sig);
{{</highlight>}}

### Sigprocmask

Per ogni processo, il kernel mantiene una maschera di segnale, cioè un insieme di segnali la cui consegna al processo è attualmente bloccata. Se un segnale - che è bloccato - è inviato ad un processo, la consegna di quel segnale è ritardata fino a quando non viene sbloccato, rimuovendolo dalla maschera dei segnali del processo. La chiamata di sistema `sigprocmask` può essere usata in qualsiasi momento per aggiungere esplicitamente segnali alla maschera dei segnali e rimuovere segnali da essa.

{{<highlight c>}}
#include <signal.h>
// Returns 0 on success, or -1 on error
int sigprocmask(int how, const sigset_t *set, sigset_t *oldset);
{{</highlight>}}

L'argomento `how` determina i cambiamenti che `sigprocmask` fa alla maschera di segnale:

* `SIG_BLOCK`: L'insieme dei segnali bloccati è l'unione dell'insieme corrente e l'argomento set.
* `SIG_UNBLOCK`: I segnali nell'argomento set vengono rimossi dall'attuale set di segnali bloccati. È lecito tentare di sbloccare un segnale che non è bloccato.
* `SIG_SETMASK`: L'insieme dei segnali bloccati viene impostato sull'argomento set. In ogni caso, se l'argomento oldset non è NULL, esso punta a un sigset_t che viene utilizzato per restituire la precedente maschera di segnale. Se vogliamo recuperare la maschera di segnale senza cambiarla, allora possiamo specificare NULL per l'argomento set, nel qual caso l'argomento `how` viene ignorato.

{{<summary title="Bloccare un segnale a parte SIGTERM">}}
{{<highlight c>}}
int main (int argc, char *argv[]) {
	sigset_t mySet, prevSet;
	// inizializziamo mySet per contenere tutti i segnali
	sigfillset(&mySet);
	// rimuove SIGTERM da mySet
	sigdelset(&mySet, SIGTERM);
	// bloccare tutti i segnali tranne SIGTERM
	sigprocmask(SIG_SETMASK, &mySet, &prevSet);
	// il processo non è interrotto da segnali eccetto SIGTERM
	// resetta la maschera dei segnali del processo
	sigprocmask(SIG_SETMASK, &prevSet, NULL);
	// il processo non è interrotto da segnali in prevSet
	return 0;
}
{{</highlight>}}
{{</summary>}}

