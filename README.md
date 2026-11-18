# 书架 Shūjià

Lecteur de romans chinois (EPUB, TXT, PDF) avec dictionnaire intégré, vocabulaire par chapitre et synchronisation Google Drive.

Onglet **Podcasts** : des épisodes transcrits automatiquement (texte « non relu ») se lisent dans le même lecteur que les livres, avec le dictionnaire, le pinyin, le vocabulaire par chapitre et une barre audio qui suit la phrase entendue. Les épisodes restent séparés de la bibliothèque : ils n'apparaissent ni sur l'étagère, ni dans le journal, les statistiques ou les objectifs de lecture ; seul le vocabulaire est commun (avec un filtre Livres / Podcasts). La liste des épisodes et les transcriptions viennent d'un dépôt privé, lu avec un jeton GitHub enregistré dans ☁ Synchro (le jeton reste dans le navigateur) ; l'appli peut aussi y demander une transcription. Ni les transcriptions ni l'audio ne sont dans ce dépôt : l'audio est lu directement chez l'hébergeur du podcast. Une transcription (.json) peut aussi être importée à la main. Un épisode se lit en « Texte » (paragraphes) ou en « Lignes » (une ligne par phrase : l'heure, le chinois, une ligne de pinyin et, si la transcription en a, l'anglais, affiché, masqué jusqu'au toucher ou retiré ; réglages dans 字 et dans la barre audio). Le pinyin et l'anglais ne comptent jamais comme texte du livre (dictionnaire, statistiques, recherche, vocabulaire).

Onglet **TV** : des épisodes de séries publiés gratuitement par leurs producteurs sur leurs propres chaînes YouTube se lisent de la même façon (dictionnaire, pinyin, vocabulaire par épisode et par chapitre, présentation « Lignes »). La vidéo est lue dans le lecteur intégré de YouTube, en haut du texte (à côté sur grand écran, réductible dans un coin), et la barre 听 la pilote : la ligne dite est surlignée et suivie, phrase précédente/suivante, répétition, vitesse, toucher une heure pour y aller. Rien n'est chargé depuis YouTube avant d'appuyer sur ▶, et le lecteur est fermé en quittant l'épisode. Le texte vient du dépôt privé facultatif (sous-titres publiés par la chaîne, ou transcription automatique « non relue ») ou d'un fichier de sous-titres (.srt, .vtt) que le lecteur ajoute lui-même avec le lien de la vidéo. Comme les podcasts, ces épisodes restent hors de l'étagère, du journal, des statistiques et des objectifs ; dans le vocabulaire, le filtre de source distingue Livres, Podcasts et TV.

Ce dépôt ne contient que l'application. Tes livres et ton vocabulaire restent dans ton navigateur et dans un dossier caché de ton Google Drive.

Données incluses :
- CC-CEDICT (MDBG), licence CC BY-SA 4.0 : data/cedict.txt
- Dictionnaire de jieba (MIT) : data/words.txt
- pdf.js et ses CMaps (Apache 2.0) : data/cmaps.json, lib/pdf.worker.min.js
- foliate-js (MIT) pour MOBI/AZW3/FB2 et fflate (MIT) : lib/mobi.js, lib/fb2.js, lib/fflate.js
- Liste de fréquence de Jun Da (MTSU), listes HSK 3.0 et liste de caractères du 國家教育研究院 (Taïwan), intégrées à index.html
