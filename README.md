# 书架 Shūjià

Lecteur de romans chinois (EPUB, TXT, PDF) avec dictionnaire intégré, vocabulaire par chapitre et synchronisation Google Drive.

Onglet **Podcasts** : des épisodes transcrits automatiquement (texte « non relu ») se lisent dans le même lecteur que les livres, avec le dictionnaire, le pinyin, le vocabulaire par chapitre et une barre audio qui suit la phrase entendue. Les épisodes restent séparés de la bibliothèque : ils n'apparaissent ni sur l'étagère, ni dans le journal, les statistiques ou les objectifs de lecture ; seul le vocabulaire est commun (avec un filtre Livres / Podcasts). La liste des épisodes et les transcriptions viennent d'un dépôt privé, lu avec un jeton GitHub enregistré dans ☁ Synchro (le jeton reste dans le navigateur) ; l'appli peut aussi y demander une transcription. Ni les transcriptions ni l'audio ne sont dans ce dépôt : l'audio est lu directement chez l'hébergeur du podcast. Une transcription (.json) peut aussi être importée à la main.

Ce dépôt ne contient que l'application. Tes livres et ton vocabulaire restent dans ton navigateur et dans un dossier caché de ton Google Drive.

Données incluses :
- CC-CEDICT (MDBG), licence CC BY-SA 4.0 : data/cedict.txt
- Dictionnaire de jieba (MIT) : data/words.txt
- pdf.js et ses CMaps (Apache 2.0) : data/cmaps.json, lib/pdf.worker.min.js
- foliate-js (MIT) pour MOBI/AZW3/FB2 et fflate (MIT) : lib/mobi.js, lib/fb2.js, lib/fflate.js
- Liste de fréquence de Jun Da (MTSU), listes HSK 3.0 et liste de caractères du 國家教育研究院 (Taïwan), intégrées à index.html
