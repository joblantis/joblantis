# JOBLANTIS – projekt-specifikáció

> Ez a fájl az eredeti projektleírás szó szerinti mentése. Minden munkamenetben ebből dolgozz.

Építs egy mobil-first, magyar nyelvű álláskereső webappot JOBLANTIS néven, kizárólag a vendéglátás és szálloda szektorra. A platform alapelve: a felvételi döntést munkakörhöz kötött, ellenőrizhető kompetenciák döntik el, nem önbevallás. A személyiségalapú illeszkedés csak kiegészítő szempont, legfeljebb 20% súllyal. Az élmény kártyás, jobbra-balra húzogatós legyen, mint egy modern swipe-alapú app, telefonra optimalizálva.

## Munkamódszer

* Mielőtt bármit kódolnál, mentsd el ezt a teljes promptot CLAUDE.md néven a projekt gyökerében, és minden munkamenetben ebből dolgozz.
* Először plan módban vázold fel a mappastruktúrát, az adatbázissémát és az 1. fázis lépéseit. Csak jóváhagyás után kezdj kódolni.
* Fázisonként haladj, és minden fázis végén állj meg, és mutasd meg, mi készült el.

## Stack és hozzáférések

* Next.js (App Router) + TypeScript + Tailwind.
* A húzogatós kártyákhoz Framer Motiont használj (drag gesztus, rugós animáció).
* Supabase az authhoz, a Postgres adatbázishoz és a fájltároláshoz (képek, videók).
* Resend az email értesítésekhez.
* Deploy Vercelre.
* Legyen PWA, hogy telefonon kezdőképernyőre tehető legyen.
* A kulcsok a .env.local fájlban vannak: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY. Soha ne használj kitalált értékeket. Ha valami hiányzik, szólj.

## Biztonság

* Minden táblán legyen bekapcsolva a Supabase Row Level Security, szerepkör szerinti policykkal.
* A munkáltató csak a saját cégének állásait, jelentkezőit és értékeléseit látja.
* A jelölt csak a saját adatait látja és szerkeszti. A munkáltató a jelölt profilját és galériáját csak akkor látja, ha a jelölt jelentkezett hozzá.
* A Storage bucketek legyenek privátak, a fájlok aláírt URL-lel jelenjenek meg.
* A service role kulcs kizárólag szerveroldalon fusson.

## Megjelenés

* Főszín: `#001AA6` (gombokhoz, linkekhez, kiemelésekhez)
* Szövegszín: `#0A0A0A`, másodlagos szöveg: `#7A7A7A`, háttér: `#FFFFFF`
* Betűtípus: Inter
* Logó: /public/logo.png. A fejlécben a logó mellett a JOBLANTIS felirat jelenjen meg, a nyitóoldalon a "Raise your future" szlogen is.
* Letisztult, kártyaalapú UI, nagy érintési felületek, alsó navigációs sáv.
* Minden húzogatós műveletnek legyen gombos megfelelője is (X, csillag, pipa) azoknak, akik nem húzogatnak.
* Az első betöltés legyen gyors, a képek legyenek lazy loadosak.

## Szerepkörök, nyilvános rész, sablonok, helyadatok

Szerepkörök: jelölt, munkáltató (egy cégnek több helyszíne is lehet), admin.

Nyilvános rész: az állások regisztráció nélkül is böngészhetők legyenek, saját URL-lel és SEO-barát oldallal. Jelentkezéshez fiók kell.

Munkakör-sablonok, ezekhez készíts seed adatot: szakács, séf/konyhafőnök, konyhai kisegítő, mosogató, pincér, pultos/bartender, barista, recepciós, szobaasszony, hostess. Minden sablonhoz 6–10 konkrét, ellenőrizhető kompetencia tartozzon. Példák: HACCP-ismeret, érvényes egészségügyi alkalmassági, à la carte vagy bankett felszolgálási tapasztalat, POS/kasszakezelés, borismeret, koktélkészítés, kávégép-kezelés és latte art, nyelvtudás és szintje, csúcsidős terhelhetőség, késkezelés, adagolás/receptkövetés, szállodai PMS-rendszer ismerete.

Helyadatok: készíts egy seed táblát a magyar településekről irányítószámmal és koordinátákkal. A helyszínnél és a jelöltnél irányítószám vagy település kerüljön tárolásra, a távolságot pedig ebből számold légvonalban.

## Húzogatós profilépítés (jelölt)

1. A jelölt kiválaszt egy vagy több munkakört, amit keres.
2. Ezután kártyákat kap. Mindegyiken egy konkrét, munkakörhöz kötött állítás vagy helyzet szerepel, például "Csúcsidőben egyedül vittem 8+ asztalt", "Tudok latte artot készíteni", "Dolgoztam bankettes rendezvényen", "Ismerem a HACCP-szabályokat".
   * Jobbra húzás: igen, ez megy.
   * Balra húzás: nem.
   * Felfelé húzás: ebben kifejezetten erős vagyok.
3. Minden kártya egy kompetenciához kapcsolódik, és a válaszokból áll elő a candidate_skills szintje. Mindegyik "bemondott" státusszal indul.
4. A végén 8–10 rövid helyzetkártya jön a munkastílusról, például "Inkább csapatban dolgozom, mint egyedül", "Stresszben is nyugodt maradok". Ezekből egy kiegészítő munkastílus-profil áll elő, ami legfeljebb 20% súllyal számít a rangsorban.
5. A kártyák tartalma seed adat legyen munkakörönként (kb. 15–20 kártya), az adminban szerkeszthető.
6. Utána jön az alapadatok rövid varázslója: elérhetőség műszakonként, irányítószám, utazási hajlandóság km-ben, bérigény, kezdési dátum.

## Galéria és portfólió (jelölt)

* A jelölt mappákba (albumokba) rendezheti a munkáiról készült fotóit és videóit, például "Esküvői bankett 2025", "Tányérjaim", "Koktélok".
* Minden elemhez írhat rövid leírást, és hozzárendelheti egy vagy több kompetenciához.
* Képek: feltöltéskor kliensoldali tömörítés legfeljebb 2000 px-re, thumbnail generálás.
* Videók: legfeljebb 60 másodperc és 100 MB, előnézeti képpel.
* Lehessen egy rövid bemutatkozó videót is feltölteni a profil tetejére (legfeljebb 45 mp).
* A profilon az albumok csempés nézetben jelenjenek meg, teljes képernyős lapozós nézegetővel.

## Ajánlások korábbi munkáltatóktól

* A jelölt a profiljáról ajánlást kérhet: megadja a korábbi munkahely nevét, a munkáltató vagy közvetlen vezető nevét, email címét, a munkaviszony idejét és a pozíciót.
* A referens emailben kap egy linket, ahol regisztráció nélkül kitölt egy rövid űrlapot:
   * visszaigazolja a munkaviszonyt (igen/nem)
   * bejelöli, mely kompetenciákat tudja igazolni
   * ír egy rövid ajánlást (legfeljebb 600 karakter)
   * opcionálisan értékeli: újra felvenném (igen/nem)
* A beérkezett ajánlást a jelölt jóváhagyja, mielőtt megjelenik. Elrejtheti, de nem szerkesztheti.
* A profilon az ajánlás a referens nevével, a cég nevével, az időszakkal és "igazolt ajánlás" jelvénnyel jelenjen meg.
* A referens által igazolt kompetenciák "igazolt (referencia)" státuszt kapnak.
* Ha 7 napon belül nincs válasz, a rendszer egyszer emlékeztetőt küld a referensnek.

## Álláskeresés húzogatással (jelölt)

* A jelölt kártyákon kapja az állásokat illeszkedés szerinti sorrendben: fotó a helyszínről, munkakör, bérsáv, műszakrend, távolság, és hogy a kötelező kompetenciákból mennyi teljesül nála.
* Jobbra: jelentkezik. Balra: kihagyja. Felfelé: elmenti későbbre.
* Lista- és szűrőnézet is legyen (munkakör, település, távolság, bérsáv, szezonális).

## Jelöltek kezelése (munkáltató)

* A munkáltató az álláshoz jelentkezőket kártyákon látja illeszkedési pontszám szerint: bemutatkozó videó, kompetenciák (bemondott vagy igazolt jelöléssel), ajánlások száma, galéria-előnézet, távolság.
* A kártyára koppintva megnyílik a teljes profil galériával és ajánlásokkal.
* Jobbra: érdekel, a jelölt átkerül a "megnézve" oszlopba, és megnyílik a chat. Balra: elutasítás, a jelölt udvarias automatikus értesítést kap.
* Kanban pipeline nézet is legyen: új, megnézve, próbanap, ajánlat, felvéve, elutasítva.

## Rangsor

A pontszám összetevői a kötelező kompetenciák lefedettsége (igazolt készség 1,5-szeres súllyal), az előnyt jelentő kompetenciák, a műszak-elérhetőség egyezése, a távolság és legfeljebb 20% súllyal a munkastílus-illeszkedés. A pontszám mellett mindig jelenjen meg az indoklás is (mi teljesül, mi hiányzik, mi igazolt). Ha egy kötelező kompetencia hiányzik, a jelölt a lista aljára kerül, de nem tűnik el.

## Chat

A munkáltató jobbra húzása után egyszerű szöveges chat nyílik a jelölt és a munkáltató között. Supabase Realtime-mal valósítsd meg, olvasottsági jelzéssel és emailes értesítéssel az új üzenetről.

## Próbanap

A munkáltató a chatből vagy a pipeline-ból időpontot ajánl, a jelölt elfogadja. Utána a munkáltató egy rövid űrlapon pontozza ugyanazokat a kompetenciákat 1–5-ig. A legalább 4-es pontot kapott készségek automatikusan "igazolt (próbanap)" státuszt kapnak.

## Nincs ghosting szabály

Minden jelentkezésre 5 napon belül választ kell adni. A 3. napon emlékeztetőt kap a munkáltató, az 5. napon a jelentkezés automatikusan lezárul, és a jelölt udvarias értesítést kap. Az ütemezett feladatokat Vercel Cronnal vagy Supabase pg_cronnal oldd meg.

## Utókövetés

Felvétel után 30, 90 és 180 nappal a munkáltató egy egykattintásos kérdést kap emailben: még nálatok dolgozik? Megbízható, önálló, termelékeny (1–5)? Ezt az adatot tárold külön, mert később az illesztés tanítására fogjuk használni.

## Adatmodell

* companies, venues: irányítószám, település, fotók
* job_role_templates, competencies, template_competencies
* swipe_cards: munkakör, állítás szövege, kapcsolódó kompetencia vagy munkastílus-dimenzió, típus
* candidate_swipe_answers: kártya, irány (jobb / bal / fel)
* jobs: helyszín, munkakör, bérsáv, műszakrend, kezdés, szezonális-e, státusz (aktív / lejárt), lejárati dátum
* job_requirements: kompetencia + kötelező vagy előny
* candidate_profiles: elérhetőség műszakonként, irányítószám, utazási hajlandóság, bérigény, bemutatkozó videó
* candidate_skills: kompetencia, szint 1–5, státusz (bemondott / igazolt), igazolás típusa
* work_style_profile: dimenziónkénti pontszámok
* albums, media_items: típus (kép / videó), fájl, thumbnail, leírás, kapcsolódó kompetenciák, sorrend
* reference_requests: referens adatai, token, státusz, emlékeztető dátuma
* references: munkaviszony visszaigazolása, igazolt kompetenciák, ajánlás szövege, újra felvenném, jóváhagyva, rejtett
* job_swipes: jelölt, állás, irány
* applications: státuszfolyamattal
* messages: chat üzenetek
* trial_shifts: időpont, időtartam, díjazás igen/nem
* evaluations: kompetenciánként 1–5 pont + szöveges megjegyzés
* followups: 30, 90 és 180 napos utókövetés

## Fázisok

1. fázis: projektstruktúra, adatbázisséma RLS-sel, seed adatok (sablonok, kompetenciák, swipe kártyák, települések), auth és szerepkörök, cég/helyszín, állásfeladás sablonból, nyilvános álláslista.
2. fázis: húzogatós profilépítés, alapadat-varázsló, galéria albumokkal, kép- és videófeltöltés, bemutatkozó videó.
3. fázis: húzogatós álláskeresés, jelentkezés, munkáltatói jelöltkártyák, rangsor indoklással, kanban pipeline, chat.
4. fázis: ajánláskérés és referensi űrlap, próbanap-ütemezés és értékelés, igazolt státuszok.
5. fázis: email értesítések, a nincs ghosting automatizmus, utókövetés, admin felület (sablonok, kompetenciák, swipe kártyák szerkesztése, moderálás).

A fizetést most ne építsd be. Az állások státusz- és lejárati mezője legyen meg, hogy később rá lehessen kötni.
