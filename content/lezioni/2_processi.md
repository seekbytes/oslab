+++
title = "Lezione 2 - Processi"
slug = "2-processi"
date = 2021-11-08
syscall = ["fork", "getpid", "getuid", "getgid", "geteuid", "getegid", "getenv", "setenv", "unsetenv", "getcwd", "chdir", "fchdir", "dup", "_exit", "exit", "atexit", "fork", "getppid", "wait", "waitpid", "execl", "execlp", "execle", "execv", "execv", "execvp", "execve"]
description = "Interazioni tra processi: fork e execl, PID e File Descriptor Table."
author = "SeekBytes"
+++

## Ripasso

{{<definition name="processo">}}
Un processo è un'istanza di un programma in esecuzione.
{{</definition>}}

Dal punto di vista del kernel, un processo consiste di:
* memoria user-space (nello spazio utente) contenente il codice del programma,
* le variabili utilizzate nel codice, e
* una serie di strutture dati del kernel che mantengono informazioni riguardo lo stato del processo (esempio: tabelle delle pagine, tabella dei file aperti, segnali da inviare, l'utilizzo delle risorse del processo e i limiti..)

## Attributi di un processo

### Identificativo di un processo (PID)

#### getpid

La chiamata di sistema getpid restituisce l'ID di processo del processo chiamante.

{{<highlight c>}}
#include <unistd.h>
#include <sys/types.h>

pid_t getpid(void);
{{</highlight>}}

Il tipo di dati `pid_t` usato per il valore di ritorno di getpid è un tipo intero allo scopo di memorizzare gli ID dei processi.
Con l'eccezione di alcuni processi di sistema come `init` (process ID 1), non c'è una relazione fissa tra un programma e l'ID del processo processo che viene creato per eseguire quel programma.

{{<summary title="Esempio">}}
`user@localhost[~]$ ps auxf`
{{</summary>}}

Nota bene: la chiamata a getpid funziona SEMPRE!!!

### Real User ID e Effective User ID

#### getuid, getgid, geteuid, getegid

Le chiamate di sistema `getuid` e `getgid` restituiscono, rispettivamente, l'ID utente reale e l'ID del gruppo reale del processo chiamante. Le chiamate di sistema `geteuid` e `getegid` eseguono i compiti corrispondenti per gli ID effettivi.

Nota bene: funzionano sempre, non ritornano alcun tipo di errore.

{{<highlight c>}}
#include <unistd.h>
#include <sys/types.h>

uid_t getuid(void); // Real user ID
uid_t geteuid(void); // Effective user ID
gid_t getgid(void); // Real group ID
gid_t getegid(void); // Effective group ID
{{</highlight>}}

* L'ID utente reale e l'ID gruppo identificano l'utente e il gruppo a cui il processo appartiene,
* l'ID utente effettivo e l'ID gruppo sono usati per determinare i permessi concessi ad un processo quando cerca di eseguire delle operazioni.

{{<summary title="Esempio getuid, getgid, geteuid, getegid">}}
Questo è il contenuto di un file program.c

{{<highlight c>}}
#include <unistd.h>
#include <sys/types.h>
int main (int argc, char *argv[]) {
	printf("PID: %d, user-ID: real %d, effective %d\n", getpid(), getuid(), geteuid());
	return 0; 
}
{{</highlight>}}

{{<highlight bash>}}
user@localhost[~]$ gcc -o program program.c
user@localhost[~]$ ls -l program
-r-xr-xr-x 1 Professor Professor 8712 Jan 16 16:27 program
user@localhost[~]$ ./program
PID: 1234, user-ID: real 1000, effective 1000
user@localhost[~]$ sudo ./program
PID: 1423, user-ID: real 0, effective 0
user@localhost[~]$ sudo chmod u+s program
user@localhost[~]$ ls -l program
-r-sr-xr-x 1 root Professor 8712 Jan 16 16:27 program
user@localhost[~]$ ./program
PID: 4321, user-ID: real 1000, effective 0
{{</highlight>}}

{{</summary>}}

Tieni a mente: se lo **S**ticky bit non è settato, allora i permessi dell'utente sono garantiti all'eseguibile per fare operazioni. Altrimenti se è impostato, allora i permessi del **proprietario** sono garantiti all'eseguibile.

## Environ

Ogni processo ha un array associato di stringhe chiamato lista d'ambiente, o semplicemente ambiente. Ognuna di queste stringhe è una definizione della forma nome = valore. Quando un nuovo processo viene creato, eredita una copia dell'ambiente del suo genitore.

La struttura dell'elenco degli ambienti è la seguente:

<!-- immagine -->

All'interno di un programma C, si può accedere all'elenco degli ambienti in due modi:
* usando la variabile globale `char **environ`. Originariamente era usata specificamente nei sistemi POSIX, ora questa tecnica è ampiamente usata e supportata da molti sistemi.

* oppure si può anche ricevere l'ambiente corrente come terzo argomento della funzione principale. Questa tecnica è riconosciuta come standard C, ma non è supportata da tutti i sistemi operativi.

{{<summary title="Esempio prima tecnica">}}
{{<highlight c>}}
#include <stdio.h>
// Global variable pointing to the enviroment of the process.
extern char **environ;
int main(int argc, char *argv[]) {
	for (char **it = environ; (*it) != NULL; ++it) { 
		printf("--> %s\n", *it);
	}
	return 0;
}
{{</highlight>}}

{{<highlight bash>}}
user@localhost[~]$ ./program --> $HOME=/home/Professor
--> $PWD=/tmp
--> $USER=Professor
{{</highlight>}}
{{</summary>}}

{{<summary title="Esempio seconda tecnica">}}

{{<highlight c>}}
#include <stdio.h>
int main(int argc, char *argv[], char* env[]) {
	for (char **it = env; (*it) != NULL; ++it) { 
		printf("--> %s\n", *it);
	}
	return 0;
}
{{</highlight>}}

{{<highlight bash>}}
user@localhost[~]$ ./program --> $HOME=/home/Professor
--> $PWD=/tmp
--> $USER=Professor
{{</highlight>}}
{{</summary>}}

#### getenv

Dato il nome di variabile `name`, getenv ritorna un puntatore al valore della stringa accessibile tramite `name` oppure NULL se non esiste la variabile d'ambiente.

{{<highlight c>}}
#include <stdlib.h>
// Returns pointer to (value) string, or NULL if no such variable exists
char *getenv(const char *name);	
{{</highlight>}}


#### setenv

Setenv aggiunge `name=value` all'ambiente, a meno che non esista già una variabile identificata da `name` e `overwrite` abbia il valore 0. Se `overwrite` è diverso da zero, l'ambiente viene sempre cambiato. Ritorna 0 se ha successo, oppure -1 in caso di errore.

{{<highlight c>}}
#include <stdlib.h>
int setenv(const char *name, const char *value, int overwrite);
{{</highlight>}}

#### unsetenv

unsetenv rimuove la variabile dall'ambiente identificata dal nome.

{{<highlight c>}}
#include <stdlib.h>
int unsetenv(const char *name);
{{</highlight>}}

## Directory del processo

Un processo può recuperare la sua directory di lavoro corrente usando `getcwd`.

### getcwd

Quando l'invocazione ha successo, getcwd restituisce un puntatore a `cwdbuf` come risultato della sua funzione. Se il percorso della directory di lavoro corrente supera i byte di dimensione, allora getcwd restituisce NULL.

{{<highlight c>}}
#include <unistd.h>
// Returns cwdbuf on success, or NULL on error.
char *getcwd(char *cwdbuf, size_t size);
{{</highlight>}}

Il chiamante deve allocare il buffer cwdbuf in modo che abbia una lunghezza minima di byte di dimensione. (Normalmente, dimensioneremmo `cwdbuf` usando la costante `PATH_MAX`).

### chdir

La chiamata di sistema chdir cambia la directory di lavoro corrente del processo chiamante nel percorso relativo o assoluto specificato in pathname.

{{<highlight c>}}
#include <unistd.h>
// Returns 0 on success, or -1 on error
int chdir(const char *pathname);
{{</highlight>}}

### fchdir

La chiamata di sistema fchdir fa la stessa cosa di chdir, eccetto che la directory è specificata tramite un descrittore di file precedentemente ottenuto aprendo la directory con open.

{{<highlight c>}}
#define _BSD_SOURCE
#include <unistd.h>
	
// Returns 0 on success, or -1 on error.
int fchdir(int fd);
{{</highlight>}}

{{<summary title="Esempio con la fchdir">}}
{{<highlight c>}}
char buf[PATH_MAX];
// Open the current working directory
int fd = open(".", O_RDONLY);
getcwd(buf, PATH_MAX);
printf("1) Current dir:\n\t%s\n", buf);
// Move the process into /tmp
chdir("/tmp"); getcwd(buf, PATH_MAX);
printf("2) Current dir:\n\t%s\n", buf);
// Move the process back into the initial directory
fchdir(fd);
getcwd(buf, PATH_MAX);
printf("3) Current dir:\n\t%s\n", buf);
// Close the file descriptor
close(fd);
{{</highlight>}}

output:
```
1) Current dir:
/home/Professor
2) Current dir:
/tmp
3) Current dir:
/home/Professor
```
{{</summary>}}

## File Descriptor Table

Ogni processo ha una file descriptor table associata. Ogni voce rappresenta una risorsa di input/output (es. file, pipe, socket) usata dal processo.

La directory `/proc/<PID>/fd` contiene un collegamento simbolico per ogni voce della tabella dei descrittori di file di un processo. La cartella `/proc/` è uno pseudo-file system che non contiene file reali, ma alcune informazioni di sistema a tempo di esecuzione.

Un processo creato ha sempre tre descrittori di file (stdin, stdout, stderr).

{{<summary title="Vedere i file descriptor associati ad un processo">}}
{{<highlight bash>}}
user@localhost[~]$ sleep 30 &
[1] 1344
user@localhost[~]$ ls -l /proc/1344/fd
totale 0
lrwx------ 1 Professor Professor 0 Gen 18 12:35 0 -> /dev/pts/0
lrwx------ 1 Professor Professor 0 Gen 18 12:35 1 -> /dev/pts/0 
lrwx------ 1 Professor Professor 0 Gen 18 12:35 2 -> /dev/pts/0
{{</highlight>}}
{{</summary>}}

{{<summary title="Visualizzare le voci del descrittore di file di un processo">}}
{{<highlight c>}}
char buf[PATH_MAX];
// Replace %i with PID, and store the resulting string in buf.
snprintf(buf, PATH_MAX, "/proc/%i/fd/", getpid());
DIR *dir = opendir(buf);

struct dirent *dp;
while ((dp = readdir(dir)) != NULL) {
	if ((strcmp(dp->d_name,".") != 0) && (strcmp(dp->d_name,"..") != 0)) { 
		printf("\tEntry: %s\n", dp->d_name);
	} 
}
closedir(dir);
{{</highlight>}}

{{<highlight bash>}}
user@localhost[~]$ ./program
Entry: 0 // link to stdin
Entry: 1 // link to stdout
Entry: 2 // link to stderr
Entry: 3 // link to /proc/<PID>/fd directory
{{</highlight>}}
{{</summary>}}

{{<important>}}
Ad una nuova voce nella file descriptor table viene sempre assegnato l'indice più basso disponibile. Guarda l'esempio sotto.
{{</important>}}

{{<summary title="Reindirizzare il flusso di output standard di un processo a un file chiamato myfile">}}
{{<highlight c>}}
// We close STDOUT which has FD 1. The remaining file descriptors have // index 0 (stdin) and 2 (stderr).
close(STDOUT_FILENO);
// We open a new file, to which will be assigned FD 1 automatically
// because it is the lowest available index in the table.
int fd = open("myfile", O_TRUNC | O_CREAT | O_WRONLY, S_IRUSR | S_IWUSR);
// Printf uses the FD 1, thus, it will print on the file.
printf("ciao\n");
{{</highlight>}}
Nessuna stringa sarà visualizzata sul terminale, poiché il flusso stdout è chiuso. Tuttavia, tutte le stringhe stampate da printf saranno riportate in myfile.
{{</summary>}}

### dup

La chiamata di sistema dup prende un descrittore di file aperto e restituisce un nuovo descrittore che si riferisce alla stessa descrizione del file aperto. Il nuovo descrittore è garantito essere il più basso descrittore di file inutilizzato.

{{<highlight c>}}
#include <unistd.h>
// Returns (new) file descriptor on success, or -1 on error.
int dup(int oldfd);
{{</highlight>}}

{{<summary title="Esempio con dup">}}
{{<highlight c>}}
// FDT: [0, 1, 2] -> [0, 2]
close(STDOUT_FILENO);
// FDT: [0, 2] -> [0]
close(STDERR_FILENO);
// FDT: [0] -> [0, 1]
int fd = open("myfile", O_TRUNC | O_CREAT | O_WRONLY, S_IRUSR | S_IWUSR); // FDT: [0, 1] -> [0, 1, 2]
dup(1);
// FDT: [0: STDIN, 1: myfile, 2: myfile]
printf("Have a good ");
fflush(stdout);
fprintf(stderr, "day!\n");
{{</highlight>}}
{{<highlight bash>}}
 user@localhost[~]$ cat myfile Have a good day!
{{</highlight>}}
{{</summary>}}
 
## Operazioni con i processi

### Terminazione dei processi

#### \_exit

Il processo che chiama \_exit() viene sempre terminato con successo.

{{<highlight c>}}
#include <unistd.h>

void _exit(int status);
{{</highlight>}}

Il primo byte dell'argomento status definisce lo stato di terminazione del processo. Per convenzione, il valore zero indica che il processo si è concluso con successo, un valore di stato non nullo indica che il processo si è concluso senza successo.

#### exit

I programmi generalmente chiamano exit() piuttosto che \_exit().

{{<highlight c>}}
#include <stdlib.h> 

// N.B. provided by C library
void exit(int status);
{{</highlight>}}

La libreria C definisce le macro `EXIT_SUCCESS` (0) e `EXIT_FAILURE` (1)
Le seguenti azioni sono eseguite dal metodo `exit`(): 
* Chiamare i gestori di uscita.
* Cancellare i buffer del flusso stdio.
* Chiamare `_exit()`, utilizzando il valore fornito in status.

Un gestore di uscita è una funzione che viene registrata durante la vita di un processo. Viene chiamata automaticamente durante la terminazione del processo tramite `exit()`.

#### atexit

La atexit() aggiunge il puntatore di funzione fornito `func` a una lista di funzioni che sono chiamate durante la terminazione del processo.

{{<highlight c>}}
#include <stdlib.h>

// Returns 0 on success, or nonzero on error.
int atexit(void (*func)(void));
{{</highlight>}}

`func` deve essere definita: non deve prendere argomenti e non deve restituire alcun valore. Se sono registrati più gestori di uscita, allora vengono chiamati nell'ordine inverso di registrazione.

{{<summary title="Esempio con atexit">}}
{{<highlight c>}}
#include <stdlib.h> #include <stdio.h>
#include <unistd.h>
void func1() { printf("\tAtexit function 1 called\n"); }
void func2() { printf("\tAtexit function 2 called\n"); }
int main (int argc, char *argv[]) {
if (atexit(func1) != 0 || atexit(func2) != 0) _exit(EXIT_FAILURE);
exit(EXIT_SUCCESS); }
{{</highlight>}}

Ecco l'output del programma:

{{<highlight bash>}}
user@localhost[~]$ ./exit_handlers
Atexit function 2 called
Atexit function 1 called
{{</highlight>}}
{{</summary>}}

Un altro modo in cui un processo può terminare è il ritorno da main():

* eseguire un ritorno esplicito n (return n) è equivalente a chiamare exit(n);

* eseguire un ritorno implicito alla fine di main() è equivalente a chiamare exit(0) nello standard C99. Altrimenti, il comportamento del processo è indefinito.

### Creazione dei processi

#### fork

La chiamata di sistema fork() crea un nuovo processo, il figlio, che è un duplicato quasi esatto del processo chiamante, il genitore.

{{<highlight c>}}
#include <unistd.h>
// Processo padre: ritorna il process ID del figlio se la chiamata ha successo, altrimenti -1 in caso di errore.
// Nel processo figlio creato: ritorna sempre 0.
pid_t fork(void);
{{</highlight>}}

Dopo l'esecuzione di una fork(), esistono due processi e, in ogni processo, l'esecuzione continua dal punto in cui la fork() ritorna.

È indeterminato quale dei due processi sia il prossimo ad utilizzare la CPU.

Il processo figlio riceve i duplicati di tutti i descrittori di file del genitore e le relative memorie condivise (vedere le diapositive Filesystem e IPC).

Nel processo padre, ritorna il PID del processo figlio, altrimenti -1. Nel processo appena creato, la fork ritorna 0.

{{<summary title="Esempio con la fork">}}
{{<highlight c>}}
#include <unistd.h>
int main (int argc, char *argv[]) {
	int stack = 111; pid_t pid = fork();
	if (pid == -1) errExit("fork");
	// -->Both parent and child come here !!!<--
	if (pid == 0)
		stack = stack * 4;
		printf("\t%s stack %d\n", (pid==0) ? "(child )" : "(parent)", stack);
	}
	return 0;
}
{{</highlight>}}

Output del programma:

{{<highlight bash>}}
user@localhost[~]$ ./example_fork (parent) stack 111
(child ) stack 444
user@localhost[~]$ ./example_fork (child ) stack 444
(parent) stack 111
{{</highlight>}}
{{</summary>}}

L'output del terminale mostra che:
* il processo figlio ottiene la propria copia delle variabili del genitore;
* l'esecuzione di entrambi i processi, genitore e figlio, continua dal punto in cui la fork() è ritornata;

#### getppid

Ogni processo ha un genitore, cioè il processo che lo ha creato.

{{<highlight c>}}
#include <unistd.h>

// Always successfully returns PID of caller’s parent.
pid_t getppid(void);
{{</highlight>}}

L'antenato di tutti i processi è il processo init (PID=1). Se un processo figlio diventa orfano perché il suo genitore termina, allora il figlio viene "adottato" dal processo init. Le successive chiamate a `getppid()` nel figlio restituiscono 1.

{{<summary title="Esempio codice e PID zombie">}}
{{<highlight c>}}
	#include <unistd.h>
	int main (int argc, char *argv[]) { 
		pid_t pid = fork();
		if (pid == -1) { 
			errExit("fork");
		}
		if (pid == 0) {
			printf("(child ) PID: %d PPID: %d\n", getpid(), getppid());
		}
		else {
    		printf("(parent) PID: %d PPID: %d\n", getpid(), getppid());
		}
		return 0;
	}
{{</highlight>}}

L'esecuzione dell'esempio precedente ha tre diversi scenari: 

1. Il figlio viene eseguito dopo il genitore, e il genitore non viene terminato
```
(genitore) PID: 402 PPID: 350
(figlio) PID: 403 PPID: 402
```

2. Il processo figlio viene eseguito prima del processo del genitore
```
(figlio ) PID: 403 PPID: 402
(genitore) PID: 402 PPID: 350
```

3. Il processo figlio viene eseguito dopo la fine del genitore (processo zombie!)
```
(genitore) PID: 402 PPID: 350
(figlio) PID: 403 PPID: 1
```
{{</summary>}}


### Controllo dei processi figlio

#### wait

La chiamata di sistema wait attende che uno dei figli del processo chiamante termini. (vedere waitpid per l'argomento di ingresso dello stato).

{{<highlight c>}}
#include <sys/wait.h>

// Returns PID of terminated child, or -1 on error.
pid_t wait(int *status)
{{</highlight>}}

Le seguenti azioni sono eseguite da wait:
* Se il processo chiamante non ha figli non attesi, allora la wait restituisce -1 ed errno è `ECHILD`.
* Se nessun figlio è ancora terminato, allora la wait blocca il processo chiamante fino a quando un figlio termina. Se un processo figlio è già terminato, allora la wait ritorna immediatamente.
* Se status non è NULL, le informazioni sul processo figlio terminato sono memorizzate nella variabile intera a cui punta lo stato.

{{<summary title="Esempio di attesa processo figlio">}}
{{<highlight c>}}
	for (int i = 1; i <= 3; ++i) {
// Fork and ignore fork failures.
if (fork() == 0) {
printf("Child %d sleeps %d seconds...\n", getpid(), i); // Suspends the calling process for i seconds
sleep(i); _exit(0);
} }
pid_t child;
while ((child = wait(NULL)) != -1)
printf("wait() returned child %d\n", child);
if (errno != ECHILD)
printf("(wait) An unexpected error...\n");
{{</highlight>}}


Esempio di output:
```
user@localhost[~]$ ./example_wait child 75 sleeps 1 seconds
child 76 sleeps 2 seconds
child 77 sleeps 3 seconds
wait() returned child 75
wait() returned child 76
wait() returned child 77
```

{{</summary>}}

Che cosa succede ad un processo figlio che termina prima che il processo padre abbia l'opportunità di invocare la wait?

Il kernel affronta questa situazione trasformando il processo figlio terminato in un processo zombie. Questo significa che la maggior parte delle risorse detenute dal processo figlio vengono rilasciate al sistema. Le uniche parti del processo terminato ancora mantenute sono:
1. il suo ID di processo;
2. il suo stato di terminazione;
3. le statistiche di utilizzo delle risorse.

Se il processo padre termina senza chiamare wait, allora il processo figlio zombie viene "adottato" dal processo init, che eseguirà una chiamata di sistema wait qualche tempo dopo.

#### waitpid

La chiamata di sistema waitpid sospende l'esecuzione del processo chiamante finché un figlio specificato dall'argomento pid non ha cambiato stato. 

{{<highlight c>}}
#include <sys/wait.h>

// Returns a PID, 0, or -1 on error.
pid_t waitpid(pid_t pid, int *status, int options);
{{</highlight>}}

L'argomento status è lo stesso di wait. Il valore del pid determina quale processo figlio vogliamo aspettare.

* pid ≥ 0, aspetta il processo figlio che ha PID uguale a pid.
* pid = 0, aspetta qualsiasi processo figlio nel gruppo di processi dello stesso chiamante . 
* pid = -1, aspetta qualsiasi processo figlio.
* pid < -1, aspetta qualsiasi processo figlio nel gruppo di processi |pid|.

L'argomento options della chiamata di sistema waitpid è un OR di zero o alpiù delle seguenti costanti:

* WUNTRACED: ritorna quando un processo figlio viene fermato da un segnale o termina.
* WCONTINUED: ritorna quando un processo figlio è stato ripreso dalla consegna di un segnale SIGCONT.
* WNOHANG: se nessun processo figlio specificato da pid ha ancora cambiato stato, allora ritorna immediatamente, invece di bloccare (cioè, eseguire un "poll"). In questo caso, il valore di ritorno di waitpid è 0.
* 0: allora waitpid aspetta solo i processi figli terminati.

{{<summary title="Esempio 1 con la waitpid">}}
{{<highlight c>}}
pid_t pid;
for (int i = 0; i < 3; ++i) {
pid = fork();
if (pid == 0) {
// Code executed by the child process...
_exit(0);
} }
// The parent process only waits for the last created child
waitpid(pid, NULL, 0);
{{</highlight>}}
{{</summary>}}

{{<summary title="Esempio 2 con la waitpid">}}
{{<highlight c>}}
pid_t pid = fork(); 
if (pid == 0) {
	// Code executed by the child process
} else {
	// Waiting for a terminated/stopped | resumed child process.
	waitpid(pid, NULL, WUNTRACED | WCONTINUED);
}
{{</highlight>}}
{{</summary>}}

Il valore di stato impostato da waitpid, e wait, ci permette di distinguere i seguenti eventi per un processo figlio:

1. **Il processo figlio è terminato chiamando exit (o uscita).** \
La macro `WIFEXITED` restituisce true se il processo figlio è uscito normalmente.
La macro `WEXITSTATUS` restituisce lo stato di uscita del processo figlio.
{{<summary title="Esempio situazione 1">}}
{{<highlight c>}}
waitpid(-1, &status, WUNTRACED | WCONTINUED);
if (WIFEXITED(status)) {
    printf("Child exited, status=%d\n", WEXITSTATUS(status));
}
{{</highlight>}}
{{</summary>}}

2. **Il processo figlio è stato terminato con la consegna di un segnale non gestito.** \
La macro `WIFSIGNALED` restituisce true se il bambino è stato ucciso da un segnale. La macro `WTERMSIG` restituisce il numero del segnale che ha causato la fine del processo.
{{<summary title="Esempio situazione 2">}}
{{<highlight c>}}
waitpid(-1, &status, WUNTRACED | WCONTINUED);
if (WIFSIGNALED(status)) {
    printf("child killed by signal %d (%s)",
}
WTERMSIG(status), strsignal(WTERMSIG(status)));
{{</highlight>}}
{{</summary>}}

Il strsignal(int sig) è un metodo di string.h che restituisce una stringa che descrive il segnale sig (vedi IPC parte 1).

3. **Il processo figlio è stato interrotto da un segnale**.\
La macro `WIFSTOPPED` restituisce true se il processo figlio è stato fermato da un segnale.
La macro `WSTOPSIG(status)` restituisce il numero del segnale che ha fermato il processo.
{{<summary title="Esempio situazione 3">}}
{{<highlight c>}}
waitpid(-1, &status, WUNTRACED | WCONTINUED); if (WIFSTOPPED(status)) {
printf("child stopped by signal %d (%s)\n",
    WSTOPSIG(status), strsignal(WSTOPSIG(status)));
}
{{</highlight>}}
{{</summary>}}

4. **Il processo figlio è stato ripreso da un segnale SIGCONT.**\
La macro `WIFCONTINUED` restituisce true se il processo figlio è stato ripreso dalla consegna di SIGCONT.
{{<summary title="Esempio 1">}}
{{<highlight c>}}
waitpid(-1, &status, WUNTRACED | WCONTINUED);
if (WIFCONTINUED(status)) {
    printf("child resumed by a SIGCONT signal\n");
}
{{</highlight>}}
{{</summary>}}
oppure
{{<summary title="Esempio 2">}}
{{<highlight c>}}
waitpid(-1, &status, WCONTINUED);
printf("child resumed by a SIGCONT signal\n");
{{</highlight>}}
{{</summary>}}

### Esecuzione di programmi (exec)

#### Funzioni della libreria exec

{{<highlight c>}}
#include <unistd.h>
// None of the following returns on success, all return -1 on error.
int execl (const char *path, const char *arg, ... ); // ... variadic functions
int execlp(const char *path, const char *arg, ... );
int execle(const char *path, const char *arg, ... , char *const envp[]);
int execv (const char *path, char *const argv[]);
int execvp(const char *path, char *const argv[]);
int execve(const char *path, char *const argv[], char *const envp[]);
{{</highlight>}}

Nota: la lista degli argomenti deve essere terminata da un puntatore `NULL` e, poiché queste sono funzioni variabili, questo puntatore deve essere cast `(char *) NULL`.

 Funzione | path | arg | environment envp
-- | -- | -- | --
exec**l** | path assoluto | lista | environ del chiamante
exec**lp** | nome del file | lista | environ del chiamante
exec**le** | path assoluto | lista | array
exec**v** | path assoluto | array | environ del chiamante
exec**vp** | nome del file | array | environ del chiamante
exec**ve** | path assoluto | array | array

{{<summary title="Programma di esempio con la execv">}}
{{<highlight c>}}
#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>
int main(int argc, char *argv[])
{
	printf("PID of example.c = %d\n", getpid());
	char *args[] = {"Hello", "C", "Programming", NULL};
	execv("./hello", args);
	printf("Back to example.c");
	return 0;
}
{{</highlight>}}
{{</summary>}}

{{<summary title="Programma di esempio con il pid">}}
{{<highlight c>}}
#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>
int main(int argc, char *argv[])
{
	printf("We are in hello.c\n");
	printf("PID of hello.c = %d\n", getpid());
	return 0;
}
{{</highlight>}}

```
user@localhost[~]$ gcc -o example example.c
user@localhost[~]$ gcc -o hello hello.c
user@localhost[~]$ ./example
PID of example.c = 4733
We are in Hello.c
PID of hello.c = 4733
```

{{</summary>}}

TODO: mancano gli altri esempi su execl

### Osservazioni finali sulle funzioni della libreria exec

Quello che dovreste sempre tenere a mente quando usate una funzione exec:
* Il parametro di input del programma punta ad un eseguibile;
* Le liste e gli array sono sempre terminati con un puntatore NULL `(char *)NULL`;
* Per convenzione, il primo elemento di argv è il nome del programma;
* Tutte le funzioni exec non restituiscono alcun risultato in caso di successo.