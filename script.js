// ====================================================================
// ZMIENNE GLOBALNE I STRUKTURA DANYCH
// ====================================================================

// ZBIORCZA STRUKTURA DANYCH MECZU
let statystykiMeczu = {
  // Statystyki dla aktualnie rozgrywanego seta (zespołowe)
  aktualny: {
    punktyA: 0,
    punktyB: 0,
    atakiKontynuowaneA: 0,
    atakiKontynuowaneB: 0,
    bledyWlasneA: 0,
    bledyWlasneB: 0,
  },
  // Przechowuje wyniki setów
  sety: [],
};

// LICZNIKI SETÓW
let setyZespoluA = 0;
let setyZespoluB = 0;
let aktualnyNumerSeta = 1;
const maxSety = 5;

// ZMIENNE DYNAMICZNYCH SKŁADÓW
let zawodnicyA = [];
let zawodnicyB = [];
let aktualnieWybranyZawodnik = null;

// Struktura bazowa dla statystyk nowego zawodnika
const bazaStatystyk = {
  obrony: 0,
  przyjecia: { 1: 0, 2: 0, 3: 0, 4: 0 }, // 1:Dokładne, 2:Za 3m, 3:Niedokładne, 4:Błąd
  atak: { wygrany: 0, kontynuowany: 0, blad: 0 },
  serwis: {
    as: 0,
    kontynuowany: 0, // ZAGRYWKA PRZYJĘTA
    blad: 0,
  },
  blok: { punktowy: 0, dotkniecie: 0, blad: 0 },
};

// ====================================================================
// FUNKCJE INICJALIZACYJNE I POMOCNICZE
// ====================================================================

/**
 * Parsuje tekst z textarea na listę obiektów zawodników.
 */
function parsujSklad(tekst, zespol) {
  const lista = [];
  const linie = tekst.split("\n").filter((line) => line.trim() !== "");

  linie.forEach((linia) => {
    const czesci = linia.trim().split(/\s+/);

    if (czesci.length >= 2) {
      const nr = parseInt(czesci[0]);
      const imie = czesci.slice(1).join(" ");

      if (!isNaN(nr) && imie) {
        // Tworzy NOWY obiekt statystyk (głęboka kopia bazy)
        lista.push({
          nr: nr,
          imie: imie,
          zespol: zespol,
          staty: JSON.parse(JSON.stringify(bazaStatystyk)), // Statystyki dla AKTUALNEGO SETA
          historiaSetow: [], // Zapisane staty po każdym secie
        });
      }
    }
  });
  return lista;
}

/**
 * Dodaje i usuwa klasę, dając wizualne potwierdzenie kliknięcia.
 */
function wizualnePotwierdzenie(element) {
  if (!element || !element.classList) return;

  element.classList.add("clicked-feedback");

  setTimeout(() => {
    element.classList.remove("clicked-feedback");
  }, 150);
}

/**
 * Uruchamia aplikację po wczytaniu składów z formularza.
 */
function inicjujMecz() {
  const tekstA = document.getElementById("skladA").value;
  const tekstB = document.getElementById("skladB").value;

  zawodnicyA = parsujSklad(tekstA, "A");

  if (tekstB.trim() === "") {
    zawodnicyB = [];
    alert(
      "Wczytano tylko Zespół A. Statystyki indywidualne będą zbierane wyłącznie dla Zespołu A."
    );
  } else {
    zawodnicyB = parsujSklad(tekstB, "B");
  }

  if (zawodnicyA.length === 0) {
    alert("Proszę wprowadzić co najmniej jednego zawodnika dla Zespołu A!");
    return;
  }

  // Wyświetlanie aplikacji i ukrywanie konfiguracji
  document.getElementById("konfiguracja-skladu").style.display = "none";
  document.getElementById("aplikacja-statystyczna").style.display = "flex";

  // Generowanie przycisków
  generujPrzyciskiZawodnicy();

  // Wyświetlenie statystyk zespołowych
  pokazPodsumowanieZespolu();

  // Inicjalizacja listy setów
  aktualizujListeSetow();

  alert("Składy wczytane. Możesz zacząć statystyki!");
}

/**
 * Generuje przyciski dla każdego zawodnika w sekcjach A i B
 */
function generujPrzyciskiZawodnicy() {
  const skrotyA = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "0",
    "=",
    "-",
    "[",
    "]",
  ];

  const generujDlaZespolu = (zespol, lista, kontenerId) => {
    const kontener = document.getElementById(kontenerId);
    kontener.innerHTML = "";

    if (lista.length === 0) {
      kontener.textContent = `Brak wczytanych zawodników dla Zespołu ${zespol}.`;
      return;
    }

    lista.forEach((zawodnik, index) => {
      const button = document.createElement("button");

      if (zespol === "A" && index < 14) {
        const klawisz = skrotyA[index];
        let etykietaKlawisza = klawisz;
        if (klawisz === "=") etykietaKlawisza = "+/=";
        if (klawisz === "-") etykietaKlawisza = "-/_";

        button.textContent = `Nr ${zawodnik.nr} - ${zawodnik.imie} (Shift + ${etykietaKlawisza})`;
        button.setAttribute("data-shortcut", klawisz);
      } else {
        button.textContent = `Nr ${zawodnik.nr} - ${zawodnik.imie}`;
      }

      button.onclick = () => wybierzZawodnika(zawodnik);
      button.id = `zawodnik-${zawodnik.zespol}-${zawodnik.nr}`;
      kontener.appendChild(button);
    });
  };

  generujDlaZespolu("A", zawodnicyA, "zawodnicyA");
  generujDlaZespolu("B", zawodnicyB, "zawodnicyB");
}

/**
 * Ustawia wybranego zawodnika i aktualizuje interfejs
 */
function wybierzZawodnika(zawodnik) {
  // 1. Oznaczamy poprzedniego jako nieaktywnego
  if (aktualnieWybranyZawodnik) {
    const prevId = `zawodnik-${aktualnieWybranyZawodnik.zespol}-${aktualnieWybranyZawodnik.nr}`;
    const prevButton = document.getElementById(prevId);
    if (prevButton) {
      prevButton.classList.remove("zawodnik-aktywny");
    }
  }

  // 2. Ustawiamy nowego
  aktualnieWybranyZawodnik = zawodnik;

  // 3. Oznaczamy nowego jako aktywnego
  const currentId = `zawodnik-${zawodnik.zespol}-${zawodnik.nr}`;
  const currentButton = document.getElementById(currentId);
  if (currentButton) {
    currentButton.classList.add("zawodnik-aktywny");
  }

  // 4. Aktualizujemy info na ekranie
  document.getElementById(
    "wybrany-zawodnik-info"
  ).textContent = `${zawodnik.imie} (Nr ${zawodnik.nr}) - Zespół ${zawodnik.zespol}`;

  // 5. Pokazujemy podsumowanie dla tego zawodnika w aktualnie wybranym zakresie
  pokazPodsumowanie();
}

// ====================================================================
// FUNKCJE DRUŻYNOWE I SETÓW
// ====================================================================

/**
 * Funkcja dodająca punkt dla wskazanego zespołu
 */
function dodajPunkt(zespol) {
  if (zespol === "A") {
    statystykiMeczu.aktualny.punktyA++;
    document.getElementById("punktyA").textContent =
      statystykiMeczu.aktualny.punktyA;
  } else if (zespol === "B") {
    statystykiMeczu.aktualny.punktyB++;
    document.getElementById("punktyB").textContent =
      statystykiMeczu.aktualny.punktyB;
  }
  sprawdzKoniecSeta();
  pokazPodsumowanieZespolu();
}

/**
 * Funkcja dodająca punkt dla Zespołu B (gdy A popełnia błąd / jest kara)
 */
function dodajPunktPrzeciwnikaA(shortcutId) {
  dodajPunkt("B");
  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
}

/**
 * Funkcja dodająca punkt dla Zespołu A (gdy B popełnia błąd / jest kara)
 */
function dodajPunktPrzeciwnikaB(shortcutId) {
  dodajPunkt("A");
  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
}

/**
 * Funkcja dodająca Atak Kontynuowany (zespołowy)
 */
function dodajAtakKontynuowany(zespol) {
  if (zespol === "A") {
    statystykiMeczu.aktualny.atakiKontynuowaneA++;
    document.getElementById("atakiKontynuowaneA").textContent =
      statystykiMeczu.aktualny.atakiKontynuowaneA;
  } else if (zespol === "B") {
    statystykiMeczu.aktualny.atakiKontynuowaneB++;
    document.getElementById("atakiKontynuowaneB").textContent =
      statystykiMeczu.aktualny.atakiKontynuowaneB;
  }
  pokazPodsumowanieZespolu();
}

/**
 * Funkcja dodająca Błąd Własny (zespołowy)
 */
function dodajBladWlasny(zespol) {
  if (zespol === "A") {
    statystykiMeczu.aktualny.bledyWlasneA++;
    document.getElementById("bledyWlasneA").textContent =
      statystykiMeczu.aktualny.bledyWlasneA;
  } else if (zespol === "B") {
    statystykiMeczu.aktualny.bledyWlasneB++;
    document.getElementById("bledyWlasneB").textContent =
      statystykiMeczu.aktualny.bledyWlasneB;
  }
  pokazPodsumowanieZespolu();
}

/**
 * Sprawdza, czy zostały osiągnięte warunki do zakończenia seta (automatycznie)
 */
function sprawdzKoniecSeta() {
  let limitPunktow = setyZespoluA + setyZespoluB + 1 === maxSety ? 15 : 25;
  let roznicaPunktow = Math.abs(
    statystykiMeczu.aktualny.punktyA - statystykiMeczu.aktualny.punktyB
  );

  let czyKoniec = false;
  let zwyciezca = null;

  if (statystykiMeczu.aktualny.punktyA >= limitPunktow && roznicaPunktow >= 2) {
    czyKoniec = true;
    zwyciezca = "A";
  } else if (
    statystykiMeczu.aktualny.punktyB >= limitPunktow &&
    roznicaPunktow >= 2
  ) {
    czyKoniec = true;
    zwyciezca = "B";
  }

  if (czyKoniec) {
    koniecSeta(zwyciezca);
  }
}

/**
 * Zapisuje wynik seta, statystyki indywidualne i resetuje liczniki
 */
function koniecSeta(zwyciezca) {
  const punktyA = statystykiMeczu.aktualny.punktyA;
  const punktyB = statystykiMeczu.aktualny.punktyB;

  if (zwyciezca === "A") {
    setyZespoluA++;
    document.getElementById("setyA").textContent = `Sety: ${setyZespoluA}`;
    alert(`Koniec Seta! Zespół A wygrywa (${punktyA}-${punktyB})`);
  } else if (zwyciezca === "B") {
    setyZespoluB++;
    document.getElementById("setyB").textContent = `Sety: ${setyZespoluB}`;
    alert(`Koniec Seta! Zespół B wygrywa (${punktyB}-${punktyA})`);
  } else {
    return;
  }

  // 1. ZAPISYWANIE WYNIKU I STATYSTYK SETA DO HISTORII
  const statystykiSeta = {
    numer: aktualnyNumerSeta,
    wynik: { punktyA: punktyA, punktyB: punktyB },
    zwyciezca: zwyciezca,
  };
  statystykiMeczu.sety.push(statystykiSeta);

  // 2. ZAPISYWANIE STATYSTYK INDYWIDUALNYCH ZAWODNIKÓW
  [...zawodnicyA, ...zawodnicyB].forEach((zawodnik) => {
    // Zapisz statystyki z AKTUALNEGO seta do historii
    zawodnik.historiaSetow.push(JSON.parse(JSON.stringify(zawodnik.staty)));

    // Zresetuj statystyki dla nowego seta
    zawodnik.staty = JSON.parse(JSON.stringify(bazaStatystyk));
  });

  // 3. RESETOWANIE PUNKTÓW ZESPOŁOWYCH DLA NOWEGO SETA
  statystykiMeczu.aktualny = {
    punktyA: 0,
    punktyB: 0,
    atakiKontynuowaneA: 0,
    atakiKontynuowaneB: 0,
    bledyWlasneA: 0,
    bledyWlasneB: 0,
  };

  document.getElementById("punktyA").textContent = 0;
  document.getElementById("punktyB").textContent = 0;
  document.getElementById("atakiKontynuowaneA").textContent = 0;
  document.getElementById("atakiKontynuowaneB").textContent = 0;
  document.getElementById("bledyWlasneA").textContent = 0;
  document.getElementById("bledyWlasneB").textContent = 0;

  // 4. AKTUALIZACJA LICZNIKA SETA I LISTY WYBORU
  aktualnyNumerSeta = setyZespoluA + setyZespoluB + 1;
  aktualizujListeSetow();

  // Sprawdzenie, czy zakończył się mecz
  if (setyZespoluA === 3 || setyZespoluB === 3) {
    alert(
      `KONIEC MECZU! Wygrywa Zespół ${zwyciezca} wynikiem ${setyZespoluA}:${setyZespoluB}!`
    );
  }

  console.log(`Rozpoczęto Set ${aktualnyNumerSeta}`);
  pokazPodsumowanieZespolu();
}

/**
 * Aktualizuje listę rozwijaną setów do wyświetlania statystyk
 */
function aktualizujListeSetow() {
  const select = document.getElementById("zakres-setow");
  // Usuń stare opcje setów, pozostawiając 'ALL' i 'CURRENT'
  while (select.options.length > 2) {
    select.remove(2);
  }

  // Dodaj opcje dla zakończonych setów
  statystykiMeczu.sety.forEach((set) => {
    const option = document.createElement("option");
    option.value = set.numer;
    option.textContent = `Set ${set.numer} (${set.wynik.punktyA}:${set.wynik.punktyB})`;
    select.appendChild(option);
  });

  // Upewnij się, że opcja "Aktualny Set" jest wybrana
  select.value = "CURRENT";
}

// ====================================================================
// FUNKCJE INDYWIDUALNE
// ====================================================================

function dodajPrzyjecie(typ, shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }
  const zespol = aktualnieWybranyZawodnik.zespol;
  const przeciwnik = zespol === "A" ? "B" : "A";

  aktualnieWybranyZawodnik.staty.przyjecia[typ.toString()]++;

  if (typ === 4) {
    dodajPunkt(przeciwnik);
    dodajBladWlasny(zespol);
  }

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
  pokazPodsumowanieZespolu();
}

function dodajObrone(shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }

  aktualnieWybranyZawodnik.staty.obrony++;

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
  pokazPodsumowanieZespolu();
}

function dodajAtak(typ, shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }
  const zespol = aktualnieWybranyZawodnik.zespol;
  const przeciwnik = zespol === "A" ? "B" : "A";

  if (typ === 1) {
    aktualnieWybranyZawodnik.staty.atak.wygrany++;
    dodajPunkt(zespol);
  } else if (typ === 2) {
    aktualnieWybranyZawodnik.staty.atak.kontynuowany++;
    dodajAtakKontynuowany(zespol);
  } else if (typ === 3) {
    aktualnieWybranyZawodnik.staty.atak.blad++;
    dodajBladWlasny(zespol);
    dodajPunkt(przeciwnik);
  }

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
  pokazPodsumowanieZespolu();
}

function dodajAs(shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }
  const zespol = aktualnieWybranyZawodnik.zespol;

  aktualnieWybranyZawodnik.staty.serwis.as++;
  dodajPunkt(zespol);

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
  pokazPodsumowanieZespolu();
}

function dodajSerwisKontynuowany(shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }

  aktualnieWybranyZawodnik.staty.serwis.kontynuowany++;

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
  pokazPodsumowanieZespolu();
}

function dodajBladSerwisowy(shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }
  const zespol = aktualnieWybranyZawodnik.zespol;
  const przeciwnik = zespol === "A" ? "B" : "A";

  aktualnieWybranyZawodnik.staty.serwis.blad++;
  dodajBladWlasny(zespol);
  dodajPunkt(przeciwnik);

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
  pokazPodsumowanieZespolu();
}

function dodajBlokPunktowy(shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }
  const zespol = aktualnieWybranyZawodnik.zespol;

  aktualnieWybranyZawodnik.staty.blok.punktowy++;
  dodajPunkt(zespol);

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
  pokazPodsumowanieZespolu();
}

function dodajBlokDotkniecie(shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }

  aktualnieWybranyZawodnik.staty.blok.dotkniecie++;

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
  pokazPodsumowanieZespolu();
}

function dodajBladBloku(shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }
  const zespol = aktualnieWybranyZawodnik.zespol;
  const przeciwnik = zespol === "A" ? "B" : "A";

  aktualnieWybranyZawodnik.staty.blok.blad++;
  dodajBladWlasny(zespol);
  dodajPunkt(przeciwnik);

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
  pokazPodsumowanieZespolu();
}

// ====================================================================
// FUNKCJE OBLICZEŃ I WYŚWIETLANIA
// ====================================================================

/**
 * Pobiera statystyki indywidualne lub zbiorcze w zależności od wybranego zakresu.
 */
function pobierzDaneDlaZakresu(zawodnik, zakres) {
  if (zakres === "CURRENT") {
    // Statystyki dla aktualnie rozgrywanego seta (staty).
    return zawodnik.staty;
  }

  let statyDoZsumowania = [];

  // 1. Zbieranie statystyk historycznych
  if (zakres === "ALL") {
    // Wszystkie zakończone sety
    statyDoZsumowania.push(...zawodnik.historiaSetow);
  } else {
    // Konkretny set (np. '1', '2')
    const setIndex = parseInt(zakres) - 1;
    if (zawodnik.historiaSetow[setIndex]) {
      statyDoZsumowania.push(zawodnik.historiaSetow[setIndex]);
    }
  }

  // 2. Dodanie statystyk aktualnego seta, jeśli jest w zakresie (ALL lub CURRENT)
  if (zakres === "ALL" || zakres === aktualnyNumerSeta.toString()) {
    // Tworzenie kopii, aby uniknąć modyfikacji 'zawodnik.staty'
    statyDoZsumowania.push(JSON.parse(JSON.stringify(zawodnik.staty)));
  }

  // 3. Sumowanie statystyk
  const suma = JSON.parse(JSON.stringify(bazaStatystyk));

  statyDoZsumowania.forEach((setStaty) => {
    suma.obrony += setStaty.obrony;
    suma.przyjecia[1] += setStaty.przyjecia[1];
    suma.przyjecia[2] += setStaty.przyjecia[2];
    suma.przyjecia[3] += setStaty.przyjecia[3];
    suma.przyjecia[4] += setStaty.przyjecia[4];
    suma.atak.wygrany += setStaty.atak.wygrany;
    suma.atak.kontynuowany += setStaty.atak.kontynuowany;
    suma.atak.blad += setStaty.atak.blad;
    suma.serwis.as += setStaty.serwis.as;
    suma.serwis.kontynuowany += setStaty.serwis.kontynuowany;
    suma.serwis.blad += setStaty.serwis.blad;
    suma.blok.punktowy += setStaty.blok.punktowy;
    suma.blok.dotkniecie += setStaty.blok.dotkniecie;
    suma.blok.blad += setStaty.blok.blad;
  });

  return suma;
}

/**
 * Wyświetla aktualne statystyki wybranego zawodnika i oblicza skuteczność
 */
function pokazPodsumowanie() {
  if (!aktualnieWybranyZawodnik) {
    document.getElementById("podsumowanie-zawodnika").style.display = "none";
    return;
  }

  // POBRANIE WYBRANEGO ZAKRESU STATYSTYK
  const zakres = document.getElementById("zakres-setow").value;
  const s = pobierzDaneDlaZakresu(aktualnieWybranyZawodnik, zakres);

  const p = s.przyjecia;
  const atk = s.atak;
  const srv = s.serwis;
  const blk = s.blok;

  // OBLICZENIA POMOCNICZE
  const sumaPrzyjec = p["1"] + p["2"] + p["3"] + p["4"];
  const sumaAtakow = atk.wygrany + atk.kontynuowany + atk.blad;
  const sumaSerwisow = srv.as + srv.kontynuowany + srv.blad;
  const sumaAkcjiBloku = blk.punktowy + blk.dotkniecie + blk.blad;
  const sumaBledowIndywidualnych = p["4"] + atk.blad + srv.blad + blk.blad;

  // Obliczenie Skuteczności Ataku
  let skutecznośćAtaku = sumaAtakow > 0 ? atk.wygrany / sumaAtakow : 0;
  const procAtaku = (skutecznośćAtaku * 100).toFixed(1);

  // Obliczenie Procentów Przyjęcia
  let procPrzyjecieIdealne =
    sumaPrzyjec > 0 ? ((p["1"] / sumaPrzyjec) * 100).toFixed(1) : 0;
  let procPrzyjeciePozytywne =
    sumaPrzyjec > 0 ? (((p["1"] + p["2"]) / sumaPrzyjec) * 100).toFixed(1) : 0;

  // ====================================================================
  // GENEROWANIE TABELI HTML
  // ====================================================================

  document.getElementById("podsumowanie-imie-nr").textContent = `${
    aktualnieWybranyZawodnik.imie
  } (Nr ${aktualnieWybranyZawodnik.nr}) - Zakres: ${
    zakres === "ALL"
      ? "Cały Mecz"
      : zakres === "CURRENT"
      ? "Aktualny Set"
      : `Set ${zakres}`
  }`;

  let html = "";

  // Tabela 1: PRZYJĘCIE
  html += '<table class="stat-table">';
  html +=
    '<thead><tr class="stat-category-header"><th colspan="2">PRZYJĘCIE</th></tr></thead>';
  html += "<tbody>";
  html += `<tr><td>1. Dokładne (do siatki)</td><td>${p["1"]}</td></tr>`;
  html += `<tr><td>2. Za 3m</td><td>${p["2"]}</td></tr>`;
  html += `<tr><td>3. Niedokładne (tył)</td><td>${p["3"]}</td></tr>`;
  html += `<tr><td>4. Błąd w przyjęciu</td><td>${p["4"]}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Suma przyjęć</td><td>${sumaPrzyjec}</td></tr>`;
  html += `<tr class="stat-percentage"><td>% Precyzyjne (1)</td><td>${procPrzyjecieIdealne}%</td></tr>`;
  html += `<tr class="stat-percentage"><td>% Pozytywne (1 + 2)</td><td>${procPrzyjeciePozytywne}%</td></tr>`;
  html += "</tbody></table>";

  // Tabela 2: ATAK
  html += '<table class="stat-table">';
  html +=
    '<thead><tr class="stat-category-header"><th colspan="2">ATAK</th></tr></thead>';
  html += "<tbody>";
  html += `<tr><td>Atak Skuteczny (Punkt)</td><td>${atk.wygrany}</td></tr>`;
  html += `<tr><td>Atak Kontynuowany</td><td>${atk.kontynuowany}</td></tr>`;
  html += `<tr><td>Błąd w Ataku</td><td>${atk.blad}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Suma ataków</td><td>${sumaAtakow}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Skuteczność Ataku</td><td>${procAtaku}%</td></tr>`;
  html += "</tbody></table>";

  // Tabela 3: SERWIS, BLOK, OBRONA i BŁĘDY
  html += '<table class="stat-table">';
  html +=
    '<thead><tr class="stat-category-header"><th colspan="2">SERWIS, BLOK, OBRONA</th></tr></thead>';
  html += "<tbody>";
  html += `<tr><td>As Serwisowy (Punkt)</td><td>${srv.as}</td></tr>`;
  html += `<tr><td>Błąd Serwisowy</td><td>${srv.blad}</td></tr>`;
  html += `<tr><td>Blok Punktowy</td><td>${blk.punktowy}</td></tr>`;
  html += `<tr><td>Dotknięcie Bloku</td><td>${blk.dotkniecie}</td></tr>`;
  html += `<tr><td>Błąd Bloku</td><td>${blk.blad}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Suma Akcji Bloku</td><td>${sumaAkcjiBloku}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Obrony</td><td>${s.obrony}</td></tr>`;
  html += `<tr class="stat-percentage" style="background-color: #f8d7da;"><td>ŁĄCZNIE BŁĘDÓW</td><td>${sumaBledowIndywidualnych}</td></tr>`;
  html += "</tbody></table>";

  document.getElementById("szczegoly-zawodnika").innerHTML = html;
  document.getElementById("podsumowanie-zawodnika").style.display = "block";
}

function obliczStatystykiZespolu(zawodnicy) {
  const zakres = document.getElementById("zakres-setow").value;

  const suma = {
    obrony: 0,
    przyjecia: { 1: 0, 2: 0, 3: 0, 4: 0 },
    atak: { wygrany: 0, kontynuowany: 0, blad: 0 },
    serwis: { as: 0, kontynuowany: 0, blad: 0 },
    blok: { punktowy: 0, dotkniecie: 0, blad: 0 },
    bledyIndywidualne: 0,
  };

  if (zawodnicy.length === 0) return suma;

  zawodnicy.forEach((zawodnik) => {
    const s = pobierzDaneDlaZakresu(zawodnik, zakres); // Użycie funkcji pobierającej zakres

    suma.obrony += s.obrony;
    suma.przyjecia[1] += s.przyjecia[1];
    suma.przyjecia[2] += s.przyjecia[2];
    suma.przyjecia[3] += s.przyjecia[3];
    suma.przyjecia[4] += s.przyjecia[4];
    suma.atak.wygrany += s.atak.wygrany;
    suma.atak.kontynuowany += s.atak.kontynuowany;
    suma.atak.blad += s.atak.blad;
    suma.serwis.as += s.serwis.as;
    suma.serwis.kontynuowany += s.serwis.kontynuowany;
    suma.serwis.blad += s.serwis.blad;
    suma.blok.punktowy += s.blok.punktowy;
    suma.blok.dotkniecie += s.blok.dotkniecie;
    suma.blok.blad += s.blok.blad;

    suma.bledyIndywidualne +=
      s.przyjecia[4] + s.atak.blad + s.serwis.blad + s.blok.blad;
  });

  return suma;
}

/**
 * Wyświetla aktualne, zsumowane statystyki obu zespołów.
 */
function pokazPodsumowanieZespolu() {
  const zakres = document.getElementById("zakres-setow").value;
  const statyA = obliczStatystykiZespolu(zawodnicyA);
  const statyB = obliczStatystykiZespolu(zawodnicyB);

  // Pobieramy dane zespołowe w zależności od zakresu
  let punktyA = 0,
    punktyB = 0,
    bledyWlasneA = 0,
    bledyWlasneB = 0,
    atakiKontynuowaneA = 0,
    atakiKontynuowaneB = 0;

  if (zakres === "CURRENT") {
    punktyA = statystykiMeczu.aktualny.punktyA;
    punktyB = statystykiMeczu.aktualny.punktyB;
    bledyWlasneA = statystykiMeczu.aktualny.bledyWlasneA;
    bledyWlasneB = statystykiMeczu.aktualny.bledyWlasneB;
    atakiKontynuowaneA = statystykiMeczu.aktualny.atakiKontynuowaneA;
    atakiKontynuowaneB = statystykiMeczu.aktualny.atakiKontynuowaneB;
  } else {
    // Obliczanie sumy punktów dla wybranego zakresu setów
    statystykiMeczu.sety.forEach((set) => {
      if (zakres === "ALL" || set.numer.toString() === zakres) {
        punktyA += set.wynik.punktyA;
        punktyB += set.wynik.punktyB;
      }
    });
    // Dla zakresu ALL, dodajemy też aktualnie rozgrywany set
    if (zakres === "ALL") {
      punktyA += statystykiMeczu.aktualny.punktyA;
      punktyB += statystykiMeczu.aktualny.punktyB;
    }

    // Błędy i ataki kontynuowane są sumowane z statystyk indywidualnych
    bledyWlasneA = statyA.bledyIndywidualne;
    bledyWlasneB = statyB.bledyIndywidualne;
    atakiKontynuowaneA = statyA.atak.kontynuowany;
    atakiKontynuowaneB = statyB.atak.kontynuowany;
  }

  let html = `<h2>📈 Podsumowanie Statystyk Zespołowych - Zakres: ${
    zakres === "ALL"
      ? "Cały Mecz"
      : zakres === "CURRENT"
      ? "Aktualny Set"
      : `Set ${zakres}`
  }</h2>`;
  html += '<div id="podsumowanie-zespolu-grid">';

  html += generujTabeleZespolu(
    statyA,
    "A",
    punktyA,
    bledyWlasneA,
    atakiKontynuowaneA
  );

  if (zawodnicyB.length > 0) {
    html += generujTabeleZespolu(
      statyB,
      "B",
      punktyB,
      bledyWlasneB,
      atakiKontynuowaneB
    );
  }

  html += "</div>";

  document.getElementById("podsumowanie-zespolu").innerHTML = html;
}

/**
 * Generuje HTML tabeli statystyk dla pojedynczego zespołu na potrzeby wyświetlania na ekranie.
 */
function generujTabeleZespolu(
  s,
  zespol,
  punkty,
  bledyWlasne,
  atakiKontynuowane
) {
  const p = s.przyjecia;
  const atk = s.atak;
  const srv = s.serwis;
  const blk = s.blok;

  // OBLICZENIA POMOCNICZE
  const sumaPrzyjec = p[1] + p[2] + p[3] + p[4];
  const sumaAtakow = atk.wygrany + atk.kontynuowany + atk.blad;

  // Obliczenia Procentowe
  const procAtaku =
    sumaAtakow > 0 ? ((atk.wygrany / sumaAtakow) * 100).toFixed(1) : 0;
  const procPrzyjeciePozytywne =
    sumaPrzyjec > 0 ? (((p[1] + p[2]) / sumaPrzyjec) * 100).toFixed(1) : 0;

  // Obliczenie Efektywności Ataku (Wygrane - Błędy) / Suma Ataków
  const efektywnoscAtaku =
    sumaAtakow > 0
      ? (((atk.wygrany - atk.blad) / sumaAtakow) * 100).toFixed(1)
      : 0;

  let html = `<div class="zespol-podsumowanie">
        <h3>Zespół ${zespol} (Łączne Punkty: ${punkty}, Błędy: ${bledyWlasne}, Akcje Kontynuowane: ${atakiKontynuowane})</h3>
        <div class="zespol-stats-content">`;

  // Tabela 1: ATAK
  html += `<table class="stat-table stat-table-zespol">`;
  html += `<thead><tr class="stat-category-header"><th colspan="2">ATAK ZESPOŁOWY</th></tr></thead>`;
  html += `<tbody>`;
  html += `<tr><td>Atak Skuteczny (P)</td><td>${atk.wygrany}</td></tr>`;
  html += `<tr><td>Atak Kontynuowany</td><td>${atk.kontynuowany}</td></tr>`;
  html += `<tr style="color: #dc3545;"><td>Błąd w Ataku</td><td>${atk.blad}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Suma ataków</td><td>${sumaAtakow}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Skuteczność Ataku (P/Suma)</td><td>${procAtaku}%</td></tr>`;
  html += `<tr class="stat-percentage" style="background-color: #ccffcc; color: #008000;"><td>Efektywność Ataku (P-B/Suma)</td><td>${efektywnoscAtaku}%</td></tr>`;
  html += `</tbody></table>`;

  // Tabela 2: PRZYJĘCIE & OBRONA
  html += `<table class="stat-table stat-table-zespol">`;
  html += `<thead><tr class="stat-category-header"><th colspan="2">PRZYJĘCIE & OBRONA</th></tr></thead>`;
  html += `<tbody>`;
  html += `<tr><td>Przyjęcie Dokładne (1)</td><td>${p[1]}</td></tr>`;
  html += `<tr><td>Przyjęcie Za 3m (2)</td><td>${p[2]}</td></tr>`;
  html += `<tr style="color: #dc3545;"><td>Błąd w Przyjęciu (4)</td><td>${p[4]}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Suma Przyjęć</td><td>${sumaPrzyjec}</td></tr>`;
  html += `<tr class="stat-percentage"><td>% Pozytywne (1+2)</td><td>${procPrzyjeciePozytywne}%</td></tr>`;
  html += `<tr class="stat-percentage"><td>Obrony</td><td>${s.obrony}</td></tr>`;
  html += `</tbody></table>`;

  // Tabela 3: SERWIS & BLOK & BŁĘDY
  html += `<table class="stat-table stat-table-zespol">`;
  html += `<thead><tr class="stat-category-header"><th colspan="2">SERWIS & BLOK</th></tr></thead>`;
  html += `<tbody>`;
  html += `<tr><td>As Serwisowy (P)</td><td>${srv.as}</td></tr>`;
  html += `<tr style="color: #dc3545;"><td>Błąd Serwisowy</td><td>${srv.blad}</td></tr>`;
  html += `<tr><td>Blok Punktowy (P)</td><td>${blk.punktowy}</td></tr>`;
  html += `<tr style="color: #dc3545;"><td>Błąd Bloku</td><td>${blk.blad}</td></tr>`;
  html += `<tr class="stat-percentage" style="background-color: #f8d7da; color: #dc3545;"><td>Suma Błędów Indywidualnych</td><td>${s.bledyIndywidualne}</td></tr>`;
  html += `</tbody></table>`;

  html += `</div></div>`;
  return html;
}

// ====================================================================
// FUNKCJA EKSPORTU DO PDF (GENEROWANIE CZYSTYCH DANYCH)
// ====================================================================

/**
 * Generuje HTML dla podsumowania zespołu dla eksportu PDF.
 */
function generujTabelęZespołuDlaPDF(
  statystyki,
  zespół,
  punkty,
  bledyWlasne,
  atakiKontynuowane,
  nazwaSeta
) {
  const s = statystyki;
  const p = s.przyjecia;
  const atk = s.atak;
  const sumaPrzyjec = p[1] + p[2] + p[3] + p[4];
  const sumaAtakow = atk.wygrany + atk.kontynuowany + atk.blad;

  let procAtaku =
    sumaAtakow > 0 ? ((atk.wygrany / sumaAtakow) * 100).toFixed(1) : 0;
  let efektywnoscAtaku =
    sumaAtakow > 0
      ? (((atk.wygrany - atk.blad) / sumaAtakow) * 100).toFixed(1)
      : 0;
  let procPrzyjeciePozytywne =
    sumaPrzyjec > 0 ? (((p[1] + p[2]) / sumaPrzyjec) * 100).toFixed(1) : 0;

  // Używamy stylizacji inline, aby zapewnić poprawne formatowanie w PDF
  let html = `
        <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
            <h3 style="color: #2c3e50; border-bottom: 1px solid #ccc; padding-bottom: 5px;">
                ZESPÓŁ ${zespół} - ${nazwaSeta}
            </h3>
            <p style="font-weight: bold;">Łączny Wynik: ${punkty} | Błędy Własne: ${bledyWlasne} | Akcje Kontynuowane: ${atakiKontynuowane}</p>

            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead style="background-color: #34495e; color: white;">
                    <tr><th colspan="3" style="padding: 8px; border: 1px solid #ddd;">Statystyki Zespołowe</th></tr>
                </thead>
                <tbody>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;">Atak Skuteczny (P)</td><td>${atk.wygrany}</td><td>${procAtaku}% (Skuteczność)</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;">Błąd w Ataku</td><td>${atk.blad}</td><td>${efektywnoscAtaku}% (Efektywność)</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;">Asy Serwisowe (P)</td><td>${s.serwis.as}</td><td></td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;">Błędy Serwisowe</td><td>${s.serwis.blad}</td><td></td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;">Blok Punktowy (P)</td><td>${s.blok.punktowy}</td><td></td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;">% Przyjęcie Pozytywne</td><td>${procPrzyjeciePozytywne}%</td><td>Suma Przyjęć: ${sumaPrzyjec}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd; background-color: #f8d7da;">Suma Błędów Indywidualnych</td><td colspan="2">${s.bledyIndywidualne}</td></tr>
                </tbody>
            </table>
        </div>
    `;
  return html;
}

/**
 * Generuje HTML dla statystyk indywidualnych zawodników dla eksportu PDF.
 */
function generujTabelęIndywidualnąDlaPDF(zawodnicy, zakres, nazwaSeta) {
  if (zawodnicy.length === 0) return "";

  let html = `
        <h3 style="color: #2c3e50; border-bottom: 1px solid #ccc; padding-top: 15px;">
            Statystyki Zawodników (Zespół ${zawodnicy[0].zespol}) - ${nazwaSeta}
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9em; margin-bottom: 20px;">
            <thead style="background-color: #5c7c99; color: white;">
                <tr>
                    <th style="padding: 8px; border: 1px solid #ddd;">Nr</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Zawodnik</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Sk. Ataku %</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Pkt Ataku</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Bł. Ataku</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">% Przyj. Pozyt.</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Asy</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Bł. Serwis.</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Blok Pkt</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Obrony</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Suma Błędów</th>
                </tr>
            </thead>
            <tbody>
    `;

  zawodnicy.forEach((zawodnik) => {
    const s = pobierzDaneDlaZakresu(zawodnik, zakres);
    const p = s.przyjecia;
    const atk = s.atak;

    const sumaAtakow = atk.wygrany + atk.kontynuowany + atk.blad;
    const sumaPrzyjec = p[1] + p[2] + p[3] + p[4];
    const sumaBledow = p[4] + atk.blad + s.serwis.blad + s.blok.blad;

    let procAtaku =
      sumaAtakow > 0 ? ((atk.wygrany / sumaAtakow) * 100).toFixed(1) : 0;
    let procPrzyjeciePozytywne =
      sumaPrzyjec > 0 ? (((p[1] + p[2]) / sumaPrzyjec) * 100).toFixed(1) : 0;

    html += `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${zawodnik.nr}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${zawodnik.imie}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${procAtaku}%</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${atk.wygrany}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${atk.blad}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${procPrzyjeciePozytywne}%</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${s.serwis.as}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${s.serwis.blad}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${s.blok.punktowy}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${s.obrony}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; background-color: #fff0f0;">${sumaBledow}</td>
            </tr>
        `;
  });

  html += `</tbody></table>`;
  return html;
}

/**
 * Eksportuje czyste dane statystyczne do pliku PDF.
 */
function eksportujDoPDF() {
  const zakres = document.getElementById("zakres-setow").value;
  let nazwaZakresu = "";
  let punktyA = 0,
    punktyB = 0,
    bledyWlasneA = 0,
    bledyWlasneB = 0,
    atakiKontynuowaneA = 0,
    atakiKontynuowaneB = 0;

  // 1. USTALENIE ZAKRESU I PUNKTÓW ZESPOŁOWYCH

  if (zakres === "CURRENT") {
    nazwaZakresu = `Aktualny Set (${aktualnyNumerSeta})`;
    punktyA = statystykiMeczu.aktualny.punktyA;
    punktyB = statystykiMeczu.aktualny.punktyB;
  } else if (zakres === "ALL") {
    nazwaZakresu = "Cały Mecz";
    // Sumowanie punktów ze wszystkich zakończonych setów
    statystykiMeczu.sety.forEach((set) => {
      punktyA += set.wynik.punktyA;
      punktyB += set.wynik.punktyB;
    });
    // Dodanie punktów z aktualnego seta
    punktyA += statystykiMeczu.aktualny.punktyA;
    punktyB += statystykiMeczu.aktualny.punktyB;
  } else {
    nazwaZakresu = `Set ${zakres}`;
    const setWybrany = statystykiMeczu.sety.find(
      (set) => set.numer.toString() === zakres
    );
    if (setWybrany) {
      punktyA = setWybrany.wynik.punktyA;
      punktyB = setWybrany.wynik.punktyB;
    } else if (zakres === aktualnyNumerSeta.toString()) {
      punktyA = statystykiMeczu.aktualny.punktyA;
      punktyB = statystykiMeczu.aktualny.punktyB;
    }
  }

  // Obliczanie statystyk zespołowych (bazuje na statystykach indywidualnych z danego zakresu)
  const statyA = obliczStatystykiZespolu(zawodnicyA);
  const statyB = obliczStatystykiZespolu(zawodnicyB);

  bledyWlasneA = statyA.bledyIndywidualne;
  bledyWlasneB = statyB.bledyIndywidualne;
  atakiKontynuowaneA = statyA.atak.kontynuowany;
  atakiKontynuowaneB = statyB.atak.kontynuowany;

  // 2. GENEROWANIE CZYSTEGO HTML DANYCH
  let tytul = `<h1>🏐 Raport Statystyczny Siatkówka</h1>`;
  let podtytul = `<h2>${nazwaZakresu} - Wynik Zespoły A: ${setyZespoluA} / Zespół B: ${setyZespoluB}</h2>`;

  // 3. GENEROWANIE TREŚCI
  let content = tytul + podtytul;

  // Tabela Zespołowa A
  content += generujTabelęZespołuDlaPDF(
    statyA,
    "A",
    punktyA,
    bledyWlasneA,
    atakiKontynuowaneA,
    nazwaZakresu
  );

  // Tabela Zespołowa B (jeśli istnieje)
  if (zawodnicyB.length > 0) {
    content += generujTabelęZespołuDlaPDF(
      statyB,
      "B",
      punktyB,
      bledyWlasneB,
      atakiKontynuowaneB,
      nazwaZakresu
    );
  }

  // Tabela Indywidualna A
  content += generujTabelęIndywidualnąDlaPDF(zawodnicyA, zakres, nazwaZakresu);

  // Tabela Indywidualna B (jeśli istnieje)
  if (zawodnicyB.length > 0) {
    content += generujTabelęIndywidualnąDlaPDF(
      zawodnicyB,
      zakres,
      nazwaZakresu
    );
  }

  // 4. KONFIGURACJA NAZWY PLIKU
  let nazwaPliku = "Raport_Siatkowka";
  if (zakres === "ALL") {
    nazwaPliku += "_Caly_Mecz";
  } else if (zakres === "CURRENT") {
    nazwaPliku += "_Aktualny_Set_" + aktualnyNumerSeta;
  } else {
    nazwaPliku += "_Set_" + zakres;
  }
  nazwaPliku += `_${setyZespoluA}-${setyZespoluB}.pdf`;

  // 5. OPCJE I EKSPORT PRZEZ HTML2PDF
  const opcje = {
    margin: 10,
    filename: nazwaPliku,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, logging: false, dpi: 192, letterRendering: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
  };

  if (typeof html2pdf !== "undefined") {
    html2pdf().set(opcje).from(content).save();
    console.log("Generowanie PDF czystych danych zakończone.");
  } else {
    alert("Błąd: Biblioteka html2pdf.js nie została wczytana poprawnie.");
  }
}

// ====================================================================
// GLOBALNY NASŁUCH KLUCZY (WŁASNY SYSTEM SKRÓTÓW)
// ====================================================================

document.addEventListener("keydown", function (event) {
  if (
    document.getElementById("aplikacja-statystyczna").style.display === "none"
  ) {
    return;
  }

  const klawiszSymbol = event.key.toUpperCase();
  const klawiszKod = event.code;

  // ----------------------------------------------------------------
  // 1. OBSŁUGA SKRÓTÓW ZAWODNIKÓW (Zawsze działają z Shift)
  // ----------------------------------------------------------------
  if (event.shiftKey) {
    let shortcutToSearch = null;

    if (klawiszKod.startsWith("Digit")) {
      shortcutToSearch = klawiszKod.slice(-1);
    } else if (klawiszKod === "Equal") {
      shortcutToSearch = "=";
    } else if (klawiszKod === "Minus") {
      shortcutToSearch = "-";
    } else if (klawiszKod === "BracketLeft") {
      shortcutToSearch = "[";
    } else if (klawiszKod === "BracketRight") {
      shortcutToSearch = "]";
    }

    if (shortcutToSearch) {
      const zawodnikButton = document.querySelector(
        `#zawodnicyA button[data-shortcut="${shortcutToSearch}"]`
      );

      if (zawodnikButton) {
        zawodnikButton.click();
        event.preventDefault();
        return;
      }
    }

    // ----------------------------------------------------------------
    // 2. OBSŁUGA SKRÓTÓW AKCJI (Shift + litera)
    // ----------------------------------------------------------------

    const mapowanieAkcji = {
      Q: { func: dodajPrzyjecie, args: [1, "Q"] },
      W: { func: dodajPrzyjecie, args: [2, "W"] },
      E: { func: dodajPrzyjecie, args: [3, "E"] },
      R: { func: dodajPrzyjecie, args: [4, "R"] },
      F: { func: dodajObrone, args: ["F"] },
      A: { func: dodajAtak, args: [1, "A"] },
      S: { func: dodajAtak, args: [2, "S"] },
      D: { func: dodajAtak, args: [3, "D"] },
      Z: { func: dodajAs, args: ["Z"] },
      X: { func: dodajSerwisKontynuowany, args: ["X"] },
      C: { func: dodajBladSerwisowy, args: ["C"] },
      T: { func: dodajBlokPunktowy, args: ["T"] },
      Y: { func: dodajBlokDotkniecie, args: ["Y"] },
      U: { func: dodajBladBloku, args: ["U"] },
      I: { func: dodajPunktPrzeciwnikaA, args: ["I"] },
      O: { func: dodajPunktPrzeciwnikaB, args: ["O"] },
    };

    const akcja = mapowanieAkcji[klawiszSymbol];

    if (akcja) {
      const button = document.querySelector(
        `#panel-akcji button[data-shortcut="${klawiszSymbol}"]`
      );

      if (button) {
        akcja.func(...akcja.args);
        event.preventDefault();
      }
    }
  }
});
