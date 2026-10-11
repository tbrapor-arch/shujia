# 书架 Shūjià

Lecteur de romans chinois (EPUB, TXT, PDF) avec dictionnaire intégré, vocabulaire par chapitre et synchronisation Google Drive.

Ce dépôt ne contient que l'application. Tes livres et ton vocabulaire restent dans ton navigateur et dans un dossier caché de ton Google Drive.

Données incluses :
- CC-CEDICT (MDBG), licence CC BY-SA 4.0 : data/cedict.txt
- Dictionnaire de jieba (MIT) : data/words.txt
- pdf.js et ses CMaps (Apache 2.0) : data/cmaps.json, lib/pdf.worker.min.js
- foliate-js (MIT) pour MOBI/AZW3/FB2 et fflate (MIT) : lib/mobi.js, lib/fb2.js, lib/fflate.js
- Liste de fréquence de Jun Da (MTSU), listes HSK 3.0 et liste de caractères du 國家教育研究院 (Taïwan), intégrées à index.html
