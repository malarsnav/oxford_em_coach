# Question Bank Import

The app currently uses a generated static question bank:

- `src/questionBank.generated.js`
- `src/questionBankManifest.generated.js`
- `question-assets/*.png`

The generated bank contains 800 questions:

- TSA Oxford Section 1 papers from 2008-2022
- specimen paper
- 50 questions per paper
- official answers
- official question type mapping
- recurring reasoning pattern tags
- visual crops for diagram, table, graph and chart questions

To regenerate after improving the source extraction, run:

```powershell
C:\Users\navan\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe scripts\import-question-bank.py
```

The source file is:

`../outputs/tara-tsa-practice-app/tsa-section1-question-bank.json`

The importer normalizes older labels into app labels:

- Identifying the Main Conclusion -> Main Conclusion
- Identifying an Assumption -> Assumption
- Assessing the Impact of Additional Evidence -> Additional Evidence / Strengthen / Weaken
- Detecting Flaws in Reasoning -> Flaw
- Identifying Parallel Reasoning -> Parallel Reasoning
- Numerical Reasoning -> Problem Solving

Known checked examples:

- 2010 Q50 option E is `6`
- 2013 Q31 has a visual crop
- 2015 Q48 has a visual crop
- 2018 Q49 and Q50 have visual crops
- 2020 Q36 has a visual crop
- 2021 Q43 has a visual crop
