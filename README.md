# BelkaDR – belki drewniane wg PN-EN 1995-1-1

Program do wymiarowania i sprawdzania belek z drewna litego, klejonego warstwowo i LVL według Eurokodu 5 (z wartościami Załącznika Krajowego PL), zbudowany na wzór programu **BelkaŻB** (`BelkaZB.exe`): ta sama oprawa wizualna, układ zakładek, sposób pracy (formularz + interaktywny schemat), raport z tokiem obliczeń, objaśnienia punktów normy, eksporty i aplikacja okienkowa Windows.

* `BelkaDR.exe` – wersja okienkowa dla Windows 10/11 (WebView2), pojedynczy plik, bez instalacji.
* `dist/BelkaDR.html` – ta sama aplikacja jako jeden plik HTML (działa w każdej przeglądarce, także bez internetu).

## Normy i zakres

PN-EN 1995-1-1 (+ ZK PL), PN-EN 1990, PN-EN 1991-1-1, PN-EN 1995-1-2, PN-EN 338:2016, PN-EN 14080:2013.

| Obszar | Zakres |
|---|---|
| Materiały | drewno lite iglaste C14–C50 i liściaste D18–D80 (PN-EN 338:2016), klejone GL20h–GL32h i GL20c–GL32c (PN-EN 14080), LVL (przykładowe wartości Kerto-S/Q), materiał własny – każdy parametr do edycji; blokada klasy |
| Przekrój | prostokątny b×h, przekrój złożony z n elementów, inny przekrój w dowolnym odcinku; katalog wymiarów handlowych (tarcica/KVH, BSH co 40 mm, LVL) |
| Schematy | belka swobodnie podparta, wspornik, belka ciągła do 10 przęseł ze wspornikami; podpory z blokadami x, y, z i obrotu, podatne (k_v, k_φ); węzły i przeguby (belki Gerbera); belka nachylona β (krokiew) i obrócona α (płatew) |
| Statyka | MES całej belki, elementy Timoshenki (z odkształceniami postaciowymi), zginanie w dwóch płaszczyznach, siła osiowa, skręcanie (podpory widełkowe); reakcje od każdego obciążenia i obwiednie |
| Obciążenia | stałe, użytkowe (kategorie A–H z PN-EN 1991-1-1, q_k × pasmo), śnieg, wiatr, inne zmienne (ψ ręcznie), wyjątkowe; równomierne, trapezowe, na odcinku, siły skupione (z długością docisku), m_t, N; kierunek: pionowo / ⊥ do osi / poziomo; na długość osi lub rzut poziomy; klasa trwania obciążenia (auto wg tab. 2.2 lub ręcznie); wyłączanie obciążeń |
| Kombinacje | 6.10 lub 6.10a/6.10b z każdym obciążeniem wiodącym, γ_G,sup/γ_G,inf, układ szachownicowy, **grupy k_mod wg klas trwania (3.1.3(2))**, wyjątkowa 6.11b, pożarowa, charakterystyczna, quasi-stała |
| SGN | zginanie jedno- i dwukierunkowe (6.1.6, k_m), z rozciąganiem (6.2.3) i ściskaniem (6.2.4), ścinanie z k_cr i redukcją przy podporach (6.1.7), ścinanie dwukierunkowe, skręcanie (6.1.8, k_shape), docisk na podporach i pod siłami z k_c,90 i l_ef (6.1.5), belki podcięte (6.5.2, k_v), zwichrzenie (6.3.3, l_ef wg tab. 6.1 + stężenia + położenie obciążenia), wyboczenie (6.3.2), k_h, k_sys |
| SGU | w_inst, w_fin, w_net,fin wg 2.2.3 i 7.2 (k_def, drewno mokre +1), podniesienie wykonawcze, granice z tab. 7.2 lub praktyki krajowej, drgania stropów (7.3.3: f₁, w/F, v) |
| Pożar | metoda zredukowanego przekroju (4.2.2), β_n, k_0, okładzina g-k (t_ch, t_f, k_2, k_3), nośność, ścinanie i zwichrzenie w pożarze |
| Słup i stopa | słup drewniany pod dowolną podporą, obciążony reakcjami belki z każdej kombinacji (z k_mod tej kombinacji) i ciężarem własnym: ściskanie z wyboczeniem i mimośrodem (6.3.2), docisk czoła do blachy (6.1.4); stopa stalowa – blacha wpuszczana lub dwie blachy zewnętrzne, sworznie lub śruby: nośność wg Johansena (8.11–8.13, f_h 8.32/8.33, M_y,Rk 8.30, efekt liny), n_ef (8.34), rozstawy (tab. 8.5/8.6), ścinanie blokowe (zał. A), docisk łącznika do blachy (EN 1993-1-8 tab. 3.4), docisk betonu pod blachą podstawy (EN 1993-1-8 6.2.5), kotwy – interakcja N/V (EN 1992-4, N_Rd i V_Rd z ETA); trwałość (szczelina, klasa 3) |
| Dobór | „Dobierz przekrój” (najmniejszy przekrój z katalogu), „Dobierz klasę”, „Dobierz wszystko” (klasy handlowe, najmniejszy koszt), przy zadanym wytężeniu η i opcjonalnie stałej szerokości b – w pasku nad danymi i w oknie „Przekrój” |

## Funkcje odpowiadające BelkaŻB

| BelkaŻB | BelkaDR |
|---|---|
| Dane: formularz w kolumnach + schemat belki obok, chipy stanu (SGN/SGU…), pasek doboru z wytężeniem η | to samo; nad schematem przyciski **Obciążenia / Przekrój / Węzeł / Wymiary**; **LPM** zaznacza przęsła, **PPM** – menu (obciążenia zaznaczonych przęseł lub całej belki, przekrój, węzeł, podpory); obciążenia zadawane w oknie obciążeń (cała belka, odcinek, kilka przęseł – jedno obciążenie); **legenda z polami wyboru** – pomijanie obciążeń; kliknięcie obciążenia, węzła, podpory – edycja; przełącznik wykresu pod belką: M / V / ugięcie / N / R / η / bez wykresu; Ctrl + kółko – powiększenie |
| Przekrój i zbrojenie | **Przekrój i nośność**: rysunek przekroju (słoje, lamele, przekrój resztkowy po pożarze), charakterystyki, tablica f_d dla klas trwania, przekroje decydujące z rozkładem σ i τ, tabela stateczności; **kliknięcie przekroju** (tu, w oknie „Przekrój”, w panelu obok widoku podłużnego) – zmiana wymiarów, liczby elementów i materiału |
| Wykresy M, V, T, N, ugięcia | **Wykresy M, V, N, ugięcia**: przełącznik (jeden wykres naraz albo wszystkie): M, V, N, M_z/V_z, T, ugięcia z granicami, wytężenie η(x), reakcje, kombinacje; odczyt pod kursorem; **LPM – znacznik z wartościami na wszystkich wykresach, PPM – usunięcie znaczników**; wykresy od poszczególnych obciążeń |
| Zbrojenie belki (widok 2D/3D, przekrój obok, DXF) | **Belka i podpory**: przełącznik **2D / 3D** (widok przestrzenny: obrót, przesuw, powiększenie), widok podłużny (oparcia, podcięcia, stężenia, przeguby, słupy ze stopami), **przekrój pod kursorem po prawej** z wartościami i przyciskami edycji, kliknięcie – okno przekroju w punkcie x; tabele słupów, docisku i podcięć, zestawienie drewna, eksport DXF (z słupami i stopami) |
| Podsumowanie | karty, lista niespełnionych warunków z przejściem do miejsca zmiany („pokaż →”), tabela sprawdzeń z punktem normy, warunkiem, paskiem wykorzystania, statusem, kombinacją; **automatyczne odhaczanie** – spełnione zaznaczone, niespełnione odznaczone po każdej zmianie (ręczna zmiana obowiązuje do zmiany stanu warunku); objaśnienie z tokiem obliczeń |
| Raport (pełny / statyka / własny), HTML, .odt, druk/PDF | to samo |
| Objaśnienia punktów normy | streszczenia PN-EN 1995-1-1, 1995-1-2, 1990, 1991-1-1; numery punktów klikalne w całej aplikacji |
| Wiele belek w projekcie, autozapis, Nowy/Otwórz/Zapisz (Ctrl+N/O/S), F2, Ctrl+P, tryb ciemny, telefon | to samo (pliki `.belkadr` – JSON) |

## Przyjęte założenia (do weryfikacji przez projektanta)

* γ_M wg tab. 2.3 (ZK PL): 1,3 drewno lite, 1,25 klejone, 1,2 LVL, 1,0 sytuacja wyjątkowa; k_cr = 0,67 (lite, klejone), 1,0 (LVL); k_m = 0,7.
* Klasy trwania domyślnie: użytkowe A–D, F, G – średniotrwałe, E – długotrwałe, H (dachy), śnieg i **wiatr – krótkotrwałe** (EN dopuszcza wiatr jako chwilowy; przyjęto bezpieczniej) – zmiana w opisie obciążenia.
* k_mod kombinacji – wg najkrótszego obciążenia; program sprawdza osobno grupy kombinacji dla każdej klasy trwania (np. samo G z k_mod = 0,6).
* Obwiednie: obciążenia stałe jako jedno źródło (γ_G,sup albo γ_G,inf), zmienne tylko gdzie niekorzystne; w warunkach interakcji stosowane są wartości z tej samej kombinacji (obwiednie – bezpiecznie).
* σ_m,crit wg (6.31) z I_tor wg Saint-Venanta (nieco bezpieczniej niż 6.32); dla stref M < 0 bez stężeń l_ef = długość przęsła (bezpiecznie); możliwe podanie l_ef ręcznie.
* Belki podcięte: τ z b_ef = k_cr·b (bezpiecznie). Interakcje ścinania dwukierunkowego i skręcania ze ścinaniem – wg DIN EN 1995-1-1/NA (brak w EN), oznaczone w raporcie.
* Ugięcia graniczne: do wyboru tab. 7.2 (dolne/górne wartości zakresu) lub praktyka krajowa (w_net,fin ≤ L/250 stropy, L/200 dachy), każda wartość edytowalna.
* Drgania: (EI)_b domyślnie 3,1 kNm²/m (OSB 22 mm), a = 1,5 mm/kN, b = 100, ζ = 1%, k_dist = 1,0 (bezpiecznie).
* Pożar: k_mod,fi = γ_M,fi = 1,0, k_fi wg tab. 2.1, ψ₂,₁ (zalecane) lub ψ₁,₁; bez k_h.
* LVL – wartości przykładowe; przed użyciem porównaj z deklaracją właściwości użytkowych wyrobu.
* Słup: przegubowy, stężony (siły poziome z góry słupa przejmują stężenia, chyba że zaznaczono przeniesienie reakcji poziomych na stopę); nośności kotew N_Rd, V_Rd – z ETA kotwy (wartości domyślne są przykładowe); grubość blachy podstawy i spoiny – poza zakresem.
* Poza zakresem: belki dwuspadowe, zakrzywione i o zmiennej wysokości (6.4), otwory w belkach, połączenia belki (poza stopą słupa), CLT, przekroje inne niż prostokątne, analiza II rzędu.

## Budowanie

```bash
node tools/build.js
```

```bash
node test/engine.test.js
```

```bash
python3 tools/make_winres.py
```

```bash
cd host && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-H windowsgui -s -w" -o ../BelkaDR.exe .
```

`tools/make_winres.py` (Python + Pillow) tworzy z `host/winres/icon256.png` ikonę `host/winres/BelkaDR.ico` i zasoby `host/rsrc_windows_amd64.syso` (ikona 16–256 px, manifest: DPI per-monitor, Common Controls 6) – Go dołącza je do exe automatycznie.

Struktura: `src/engine.js` – silnik obliczeń, `src/ui/*.js` – interfejs, `src/report.js` – raport, `src/norm.js` – objaśnienia normy, `src/odt.js`, `src/dxf.js` – eksporty, `src/style*.css` – wygląd, `host/main.go` – okno Windows (WebView2: natywne okna Zapisz/Otwórz, autozapis w `%LOCALAPPDATA%\BelkaDR`, otwieranie pliku `.belkadr` podanego w wierszu poleceń; bez WebView2 – aplikacja w przeglądarce).

Program jest narzędziem pomocniczym. Wyniki wymagają weryfikacji przez osobę z odpowiednimi uprawnieniami budowlanymi.
