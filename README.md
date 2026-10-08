# Lernova A1

Arabic-first German-learning PWA built around Netzwerk neu A1. The word bank covers the source glossary through Kapitel 1–12 and keeps the article separate from the German headword.

## Learning tools

- Kapitel and category filters, Arabic/German search, sorting, sentence examples, articles and plurals
- German pronunciation, listening and speaking practice
- Chapter-based A1 grammar guide, including rules from the supplied first-six-chapter book photos
- Custom quizzes: choose a chapter or all chapters, question type, and question count or all available questions
- Spaced review, quiz modes, XP, streaks and chapter progress
- Local-first storage, dark theme, mobile layout and PWA offline cache
- Supabase Auth and local/cloud progress sync configured with the provided project URL and public publishable key

## Start

Use VS Code Live Server to open `index.html`. Read `SETUP.md` for phone installation and Supabase configuration.

The source glossary text is retained in `data/source_glossar.txt`. All vocabulary data is in `data/a1.js` with `chapter`, `category`, `order`, `german`, `article`, `plural`, `arabic`, `type`, `sentence`, and `sentenceArabic` fields.

Only the browser-safe publishable key is used. The app remains usable on-device without account setup.
