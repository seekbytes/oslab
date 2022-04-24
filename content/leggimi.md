+++
title = "Leggimi"
slug = "Leggimi"
+++

Il contenuto di questo sito è basato sulle slide presentate durante il corso di sistemi operativi laboratorio tenuto presso UniVR da [Dr. Demrozi](https://www.di.univr.it/?ent=persona&id=23662) e [Prof. Castellini](https://www.di.univr.it/?ent=persona&id=4048&lang=it) A.A 2021-2022.

Un pratico menù raggruppa tutte le lezioni di laboratorio (teoria) e permette di districarvi tra tutti gli argomenti fatti a lezione. Per trovare una system call, basta scrivere il nome sulla barra di ricerca ed essere così inviati alla lezione corretta.

Tutti i refusi sono dati da errori di trascrizione e/o traduzione; chi è così gentile da volerlo segnalare, può creare una nuova [ISSUES](https://github.com/seekbytes/oslab/issues) oppure può correggere in modo autonomo l'errore e mandare una Pull Request.

Sistemi operativi è sicuramente una materia affascinante, ma il troppo materiale da studiare per il laboratorio potrebbe spaventare uno studente (ecco il perché di questo sito). Questa risorsa quindi potrebbe essere utile durante lo sviluppo del progetto di laboratorio.

## Note sui box

Troverai dei box del genere che segnalano le definizioni:

{{<definition name="Esempio">}}
Questa è una definizione di esempio
{{</definition>}}

Blocchi di codice:

{{<highlight c>}}
#include <sys/types.h>
#include <dirent.h>
// Returns pointer to an allocated structure describing the
// next directory entry, or NULL on end-of-directory or error.
struct dirent *readdir(DIR *dirp);
{{</highlight>}}

Ed esempi:

{{<summary title="Esempio">}}
{{<highlight c>}}
#include <stdio.h>

int main(){
	printf("Hello world!"); // can't use printf in SO!
	return 0;
}
{{</highlight>}}
{{</summary>}}

<!--
Infine, ultima nota, se il corso di sistemi operativi vi ha "fritto" il cervello, non disperate! Potete sempre provare a rilassarvi con ["Lo Stack da colorare"](/pdf/) e ["Unisci lo Heap"](/pdf/). O il cruciverba delle syscall. -->