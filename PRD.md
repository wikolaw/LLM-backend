\# 📘 Product Requirements Document (PRD)



\## Projekt



\*\*LLM-driven dokumentanalys och prompt-demonstration\*\*



---



\## 1. Översikt



En webbaserad demoapplikation som visar hur språkmodeller kan extrahera strukturerad data från ostrukturerade dokument (PDF, DOCX, TXT).

Användaren kan justera sin prompt, köra flera modeller parallellt via \*\*OpenRouter\*\*, jämföra resultat och exportera data i olika format.

Syftet är att pedagogiskt visa hur prompt-design påverkar modellens output och hur formatstyrning fungerar (t.ex. JSON och CSV).



---



\## 2. Målgrupp



| Typ              | Beskrivning                                      |

| ---------------- | ------------------------------------------------ |

| Konsulter        | Vill visa hur LLM:er kan användas i textanalys   |

| Utvecklare       | Vill testa promptstrategier och jämföra modeller |

| Beslutsfattare   | Vill se praktiska exempel på AI-tillämpningar    |

| Studenter/lärare | Använder lösningen i undervisning och workshops  |



---



\## 3. Mål



\* Visa hela kedjan: \*\*Upload → Extract → Inspect → Adjust Prompt → Multi-Model Run → Compare → Export\*\*

\* Förklara tydligt hur promptjustering förändrar modellens beteende

\* Demonstrera skillnader mellan modeller

\* Exportera data till JSON, CSV och databas

\* Enkel publicering via \*\*Vercel + Supabase\*\*

\* Använd \*\*Context7 MCP\*\* som dokumentationskälla för komponent- och arkitekturinformation



---



\## 4. Huvudfunktioner



| Funktion            | Beskrivning                                                        |

| ------------------- | ------------------------------------------------------------------ |

| Dokumentuppladdning | Ladda upp PDF/DOCX till Supabase Storage                           |

| Text-extraktion     | Automatisk parsing med `unstructured`, `pdfplumber`, `python-docx` |

| Prompt-editor       | Justera system- och användarprompt direkt i UI                     |

| Multi-modellkörning | Kör flera modeller parallellt via OpenRouter                       |

| JSON-validering     | Säkerställ att output följer fördefinierat schema                  |

| Resultatjämförelse  | Visa skillnader mellan modellutdata                                |

| Export              | JSON/CSV-nedladdning eller skrivning till Supabase DB              |



---



\## 5. Arkitektur



| Lager               | Komponent                   | Beskrivning                                          |

| ------------------- | --------------------------- | ---------------------------------------------------- |

| Frontend            | Next.js + Tailwind          | Användargränssnitt för uppladdning, prompt, resultat |

| Backend             | Supabase Edge Functions     | Kör OpenRouter-anrop, validering, export             |

| Lagring             | Supabase Postgres + Storage | Dokument, körningar, modellutdata                    |

| LLM-lager           | OpenRouter API              | Hanterar flera språkmodeller (Claude, GPT, Gemini)   |

| Dokumentationskälla | Context7 MCP                | Ger åtkomst till dokumentation och kodreferenser     |

| Auth                | Supabase Auth               | GitHub/OTP-inloggning                                |

| Deployment          | Vercel                      | Hosting och CI/CD                                    |



---



\## 6. Dataflöde



1\. Användaren laddar upp dokument till Supabase Storage.

2\. Edge Function extraherar text.

3\. Prompt-redigering sker i UI.

4\. OpenRouter kör flera modeller parallellt.

5\. Resultat sparas i Supabase Postgres.

6\. JSON valideras mot schema.

7\. Användaren granskar och exporterar resultatet.



---



\## 7. Datamodell (Supabase)



| Tabell    | Viktiga fält                                                   |

| --------- | -------------------------------------------------------------- |

| documents | id, user\_id, filename, mime, storage\_path, text\_excerpt        |

| runs      | id, document\_id, prompt\_text, models\_used\[], created\_at        |

| outputs   | id, run\_id, model, json\_valid, json\_payload, cost\_in, cost\_out |

| models    | id, provider, name, price\_in, price\_out, enabled               |



---



\## 8. Prompt- och modellhantering



\* Prompt delas i två delar: \*\*System Prompt\*\* (fast) och \*\*User Prompt\*\* (redigerbar).

\* JSON Schema definierar förväntat svarformat.

\* Automatisk retry om JSON är ogiltig.

\* Parallellkörning via asynkrona anrop.

\* Resultat jämförs med fokus på giltighet, fältprecision och kostnad.



---



\## 9. Export



| Format        | Beskrivning                             |

| ------------- | --------------------------------------- |

| JSON          | Full schema-enlig output                |

| CSV           | Flattened struktur, en rad per datapost |

| DB            | Insert i Supabase Postgres              |

| Visualisering | Tabellvy och nedladdningsknappar i UI   |



---



\## 10. MCP-tjänster



\*\*Syfte:\*\* Ge Claude Code direkt åtkomst till externa källor och data under utveckling.



| MCP-tjänst    | Typ       | Användning                                            |

| ------------- | --------- | ----------------------------------------------------- |

| context7\_docs | read-only | Dokumentationskälla för projekt, komponenter och API  |

| supabase      | rest      | Lagring och hämtning av dokument, körningar, resultat |

| openrouter    | rest      | Modellkörningar och jämförelse mellan LLM:er          |

| local\_files   | fs        | Lokala filer som t.ex. promptmallar och schema        |



Claude Code ska känna till dessa via `mcp.config.json` för att kunna hämta och referera till dokumentation under utveckling.



---



\## 11. MVP-scope



| Ingår                                                   | Ej ingår (fas 2)                                                      |

| ------------------------------------------------------- | --------------------------------------------------------------------- |

| Upload, parsing, promptjustering, modellkörning, export | OCR, rollbaserad rättighetshantering, API-exponering, kundintegration |



---



\## 12. Risker och mitigering



| Risk                     | Mitigering                              |

| ------------------------ | --------------------------------------- |

| Ogiltig JSON från modell | JSON Schema + auto-retry                |

| Hög tokenkostnad         | Textbegränsning och kostnadsindikator   |

| Timeout i Edge Function  | Segmentera långa körningar              |

| Versionshantering        | Hasha prompt och lagra version i `runs` |



---



\## 13. Tidsplan



| Fas     | Tid                                   | Aktivitet                                    |

| ------- | ------------------------------------- | -------------------------------------------- |

| Vecka 1 | Setup                                 | Skapa Supabase-projekt, tabeller, UI-skelett |

| Vecka 2 | Modellkörning                         | Implementera OpenRouter-integration          |

| Vecka 3 | Prompt-editor och validering          |                                              |

| Vecka 4 | Export, jämförelsevy, test och polish |                                              |



---



\## 14. Mätvärden / KPI



\* JSON-valideringsgrad ≥ 95 %

\* Genomsnittlig svarstid < 5 s

\* 3 eller fler modeller kan testas parallellt

\* Exportfel < 1 %

\* Demo ska kunna genomföras på < 5 minuter



---



\## 15. Nästa steg



1\. Skapa Supabase-projekt och databasstrukturer.

2\. Definiera `mcp.config.json` för Context7, Supabase och OpenRouter.

3\. Implementera första Edge Function för LLM-körning.

4\. Bygg UI för dokumentuppladdning och promptjustering.

5\. Ladda upp komponent- och API-dokumentation till Context7 MCP.



---



\## 16. Källor



\* \[OpenAI Prompt Engineering Guide](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api)

\* \[Context7 MCP](https://context7.com)

\* \[Supabase Docs](https://supabase.com/docs)

\* \[OpenRouter API Docs](https://openrouter.ai/docs)



---





