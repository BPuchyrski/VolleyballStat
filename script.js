// ====================================================================
// ZMIENNE GLOBALNE I STRUKTURA DANYCH
// (Bez zmian)
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

// GLOBALNA LISTA SKRÓTÓW DLA ZAWODNIKÓW ZESPOŁU A (dla poprawnego mapowania w keydown)
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

// Zmieniona struktura bazowa dla statystyk
const bazaStatystyk = {
  obrony: 0,
  przyjecia: { 1: 0, 2: 0, 3: 0, 4: 0 }, // 1:Dokładne, 2:Za 3m, 3:Niedokładne, 4:Błąd
  atak: { wygrany: 0, kontynuowany: 0, blad: 0, zablokowany: 0 }, // DODANO: zablokowany
  serwis: {
    as: 0,
    blad: 0,
  },
  blok: { punktowy: 0, dotkniecie: 0, blad: 0 },
  innyBlad: 0, // DODANO: Inny błąd (np. siatka, przejście, błąd ustawienia)
  zagrywki: 0, // NOWE: Licznik wszystkich wykonanych zagrywek (As + Błąd + Kontynuowana)
};

// ====================================================================
// FUNKCJE INICJALIZACYJNE I POMOCNICZE
// (Bez zmian)
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
  const generujDlaZespolu = (zespol, lista, kontenerId) => {
    const kontener = document.getElementById(kontenerId);
    kontener.innerHTML = "";

    if (lista.length === 0) {
      kontener.textContent = `Brak wczytanych zawodników dla Zespołu ${zespol}.`;
      return;
    }

    lista.forEach((zawodnik, index) => {
      const button = document.createElement("button");

      if (zespol === "A" && index < skrotyA.length) {
        const klawisz = skrotyA[index];
        let etykietaKlawisza = klawisz;
        if (klawisz === "=") etykietaKlawisza = "+/=";
        if (klawisz === "-") etykietaKlawisza = "-/_";

        button.textContent = `Nr ${zawodnik.nr} - ${zawodnik.imie} (Shift + ${etykietaKlawisza})`;
        button.setAttribute("data-shortcut", klawisz); // Ustawienie skrótu
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
// (Bez zmian)
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
// (Bez zmian)
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
    // Atak Skuteczny (Punkt)
    aktualnieWybranyZawodnik.staty.atak.wygrany++;
    dodajPunkt(zespol);
  } else if (typ === 2) {
    // Atak Kontynuowany
    aktualnieWybranyZawodnik.staty.atak.kontynuowany++;
    dodajAtakKontynuowany(zespol);
  } else if (typ === 3) {
    // Błąd Ataku (aut)
    aktualnieWybranyZawodnik.staty.atak.blad++;
    dodajBladWlasny(zespol);
    dodajPunkt(przeciwnik);
  } else if (typ === 4) {
    // Atak Zablokowany
    aktualnieWybranyZawodnik.staty.atak.zablokowany++;
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
  aktualnieWybranyZawodnik.staty.zagrywki++; // Zliczamy zagrywkę
  dodajPunkt(zespol);

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
  pokazPodsumowanieZespolu();
}

/**
 * NOWA FUNKCJA: Liczy zagrywkę, która nie była asem ani błędem,
 * aby poprawnie obliczyć łączną liczbę zagrywek (Zagrywki Totalne).
 */
function dodajZagrywkeKontynuowana(shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }

  // Ważne: Zliczamy zagrywkę do licznika całkowitego
  aktualnieWybranyZawodnik.staty.zagrywki++;

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
  aktualnieWybranyZawodnik.staty.zagrywki++; // Zliczamy zagrywkę
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

function dodajInnyBlad(shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }
  const zespol = aktualnieWybranyZawodnik.zespol;
  const przeciwnik = zespol === "A" ? "B" : "A";

  aktualnieWybranyZawodnik.staty.innyBlad++; // Zapis błędu
  dodajBladWlasny(zespol);
  dodajPunkt(przeciwnik); // Punkt dla przeciwnika

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
  pokazPodsumowanieZespolu();
}

// ====================================================================
// FUNKCJE OBLICZEŃ I WYŚWIETLANIA
// (Tylko pokazPodsumowanieZespolu i generujTabeleZawodnicy zmienione)
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
    suma.atak.zablokowany += setStaty.atak.zablokowany;
    suma.serwis.as += setStaty.serwis.as;
    suma.serwis.blad += setStaty.serwis.blad;
    suma.blok.punktowy += setStaty.blok.punktowy;
    suma.blok.dotkniecie += setStaty.blok.dotkniecie;
    suma.blok.blad += setStaty.blok.blad;
    suma.innyBlad += setStaty.innyBlad;
    suma.zagrywki += setStaty.zagrywki;
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
  const sumaAtakow =
    atk.wygrany + atk.kontynuowany + atk.blad + atk.zablokowany;
  // LICZNIK ZAGRYWEK JEST TERAZ POBIERANY BEZPOŚREDNIO Z s.zagrywki
  const sumaAkcjiBloku = blk.punktowy + blk.dotkniecie + blk.blad;

  // Suma Błędów Indywidualnych (uwzględniająca nowe błędy)
  const sumaBledowIndywidualnych =
    p["4"] + atk.blad + atk.zablokowany + srv.blad + blk.blad + s.innyBlad;

  // Obliczenie Skuteczności Ataku (P/Suma Ataków)
  let skutecznośćAtaku = sumaAtakow > 0 ? atk.wygrany / sumaAtakow : 0;
  const procAtaku = (skutecznośćAtaku * 100).toFixed(1);

  // Obliczenie Efektywności Ataku (P-B-Zablokowane) / Suma Ataków
  let efektywnoscAtakuWspółczynnik =
    sumaAtakow > 0
      ? (atk.wygrany - atk.blad - atk.zablokowany) / sumaAtakow
      : 0;
  const procEfektywnoscAtaku = (efektywnoscAtakuWspółczynnik * 100).toFixed(1);

  // Obliczenie Procentów Przyjęcia
  let procPrzyjecieIdealne =
    sumaPrzyjec > 0 ? ((p["1"] / sumaPrzyjec) * 100).toFixed(1) : 0;
  let procPrzyjeciePozytywne =
    sumaPrzyjec > 0 ? (((p["1"] + p["2"]) / sumaPrzyjec) * 100).toFixed(1) : 0;

  // ====================================================================
  // GENEROWANIE TABELI HTML
  // ====================================================================

  document.getElementById("podsumowanie-zawodnika").style.display = "block";
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
  html += `<tr><td>4. Błąd w Przyjęciu</td><td>${p["4"]}</td></tr>`;
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
  html += `<tr><td style="color: #dc3545;">Błąd w Ataku (aut)</td><td>${atk.blad}</td></tr>`;
  html += `<tr><td style="color: #dc3545;">Atak Zablokowany</td><td>${atk.zablokowany}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Suma ataków</td><td>${sumaAtakow}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Skuteczność (P/Suma)</td><td>${procAtaku}%</td></tr>`;
  html += `<tr class="stat-percentage" style="background-color: #ccffcc; color: #008000;"><td>Efektywność (P-B-Zabl./Suma)</td><td>${procEfektywnoscAtaku}%</td></tr>`;
  html += "</tbody></table>";

  // Tabela 3: SERWIS
  html += '<table class="stat-table">';
  html +=
    '<thead><tr class="stat-category-header"><th colspan="2">SERWIS</th></tr></thead>';
  html += "<tbody>";
  html += `<tr><td>As Serwisowy (Pkt)</td><td>${srv.as}</td></tr>`;
  html += `<tr><td style="color: #dc3545;">Błąd Serwisowy</td><td>${srv.blad}</td></tr>`;
  // NOWY WIERSZ: Suma Zagrywek
  html += `<tr style="font-weight: bold; background-color: #fef0db;">
                <td>Suma Zagrywek</td>
                <td>${s.zagrywki}</td>
             </tr>`;
  html += "</tbody></table>";

  // Tabela 4: BLOK / OBRONA / BŁĘDY
  html += '<table class="stat-table">';
  html +=
    '<thead><tr class="stat-category-header"><th colspan="2">BLOK / OBRONA / BŁĘDY</th></tr></thead>';
  html += "<tbody>";
  html += `<tr><td>Blok Punktowy (Pkt)</td><td>${blk.punktowy}</td></tr>`;
  html += `<tr><td>Dotknięcie Bloku</td><td>${blk.dotkniecie}</td></tr>`;
  html += `<tr><td style="color: #dc3545;">Błąd Bloku</td><td>${blk.blad}</td></tr>`;
  html += `<tr><td>Obrona</td><td>${s.obrony}</td></tr>`;
  html += `<tr><td style="color: #dc3545;">Inny Błąd (siatka/przejście)</td><td>${s.innyBlad}</td></tr>`;
  html += `<tr class="stat-percentage" style="background-color: #f0c0c0; color: #dc3545;"><td>SUMA BŁĘDÓW INDYWIDUALNYCH</td><td>${sumaBledowIndywidualnych}</td></tr>`;
  html += "</tbody></table>";

  document.getElementById("szczegoly-zawodnika").innerHTML = html;
}

/**
 * Oblicza sumę statystyk dla całego zespołu.
 */
function obliczStatystykiZespolu(zawodnicy) {
  const zakres = document.getElementById("zakres-setow").value;

  // Tworzenie sumatora z bazową strukturą
  const suma = {
    obrony: 0,
    przyjecia: { 1: 0, 2: 0, 3: 0, 4: 0 },
    atak: { wygrany: 0, kontynuowany: 0, blad: 0, zablokowany: 0 },
    serwis: { as: 0, blad: 0 },
    blok: { punktowy: 0, dotkniecie: 0, blad: 0 },
    bledyIndywidualne: 0,
    innyBlad: 0,
    zagrywki: 0,
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
    suma.atak.zablokowany += s.atak.zablokowany;
    suma.serwis.as += s.serwis.as;
    suma.serwis.blad += s.serwis.blad;
    suma.blok.punktowy += s.blok.punktowy;
    suma.blok.dotkniecie += s.blok.dotkniecie;
    suma.blok.blad += s.blok.blad;
    suma.innyBlad += s.innyBlad;
    suma.zagrywki += s.zagrywki;

    // Aktualizacja sumy błędów zespołowych
    suma.bledyIndywidualne +=
      s.przyjecia[4] +
      s.atak.blad +
      s.atak.zablokowany +
      s.serwis.blad +
      s.blok.blad +
      s.innyBlad;
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
    punktyB = 0;

  // Obliczanie punktów
  if (zakres === "CURRENT") {
    punktyA = statystykiMeczu.aktualny.punktyA;
    punktyB = statystykiMeczu.aktualny.punktyB;
  } else if (zakres === "ALL") {
    // Sumowanie punktów ze wszystkich zakończonych setów
    statystykiMeczu.sety.forEach((set) => {
      punktyA += set.wynik.punktyA;
      punktyB += set.wynik.punktyB;
    });
    // Dodanie punktów z aktualnego seta
    punktyA += statystykiMeczu.aktualny.punktyA;
    punktyB += statystykiMeczu.aktualny.punktyB;
  } else {
    // Konkretny set
    const setWybrany = statystykiMeczu.sety.find(
      (set) => set.numer.toString() === zakres
    );
    if (setWybrany) {
      punktyA = setWybrany.wynik.punktyA;
      punktyB = setWybrany.wynik.punktyB;
    }
  }

  // Błędy i Ataki Kontynuowane są zawsze pobierane z sumy indywidualnej
  const bledyWlasneA = statyA.bledyIndywidualne;
  const bledyWlasneB = statyB.bledyIndywidualne;
  const atakiKontynuowaneA = statyA.atak.kontynuowany;
  const atakiKontynuowaneB = statyB.atak.kontynuowany;

  // AKTUALIZACJA WYNIKÓW w górnej sekcji dla AKTUALNEGO SETA
  if (zakres === "CURRENT") {
    document.getElementById("punktyA").textContent =
      statystykiMeczu.aktualny.punktyA;
    document.getElementById("punktyB").textContent =
      statystykiMeczu.aktualny.punktyB;
    document.getElementById("bledyWlasneA").textContent =
      statystykiMeczu.aktualny.bledyWlasneA;
    document.getElementById("bledyWlasneB").textContent =
      statystykiMeczu.aktualny.bledyWlasneB;
    document.getElementById("atakiKontynuowaneA").textContent =
      statystykiMeczu.aktualny.atakiKontynuowaneA;
    document.getElementById("atakiKontynuowaneB").textContent =
      statystykiMeczu.aktualny.atakiKontynuowaneB;
  }

  let html = "";
  html += generujPodsumowanieZespoluHTML(
    statyA,
    "A",
    punktyA,
    bledyWlasneA,
    atakiKontynuowaneA,
    zawodnicyA,
    zakres
  );

  html += generujPodsumowanieZespoluHTML(
    statyB,
    "B",
    punktyB,
    bledyWlasneB,
    atakiKontynuowaneB,
    zawodnicyB,
    zakres
  );

  // KRTYCZNA POPRAWKA: Używamy poprawnego ID: 'podsumowanie-zespolu'
  const podsumowanieElement = document.getElementById("podsumowanie-zespolu");
  if (podsumowanieElement) {
    podsumowanieElement.innerHTML = html;
  }
}

/**
 * Generuje HTML dla ogólnego podsumowania zespołu (pola i procenty)
 */
function generujPodsumowanieZespoluHTML(
  s,
  zespol,
  punkty,
  bledyWlasne,
  atakiKontynuowane,
  zawodnicy,
  zakres
) {
  const p = s.przyjecia;
  const atk = s.atak;
  const srv = s.serwis;
  const blk = s.blok;

  // OBLICZENIA POMOCNICZE
  const sumaPrzyjec = p[1] + p[2] + p[3] + p[4];
  const sumaAtakow =
    atk.wygrany + atk.kontynuowany + atk.blad + atk.zablokowany;

  // Obliczenia Procentowe
  const procAtaku =
    sumaAtakow > 0 ? ((atk.wygrany / sumaAtakow) * 100).toFixed(1) : 0;
  const procPrzyjeciePozytywne =
    sumaPrzyjec > 0 ? (((p[1] + p[2]) / sumaPrzyjec) * 100).toFixed(1) : 0;
  // Obliczenie Efektywności Ataku (Wygrane - Błędy - Zablokowane) / Suma Ataków
  const efektywnoscAtaku =
    sumaAtakow > 0
      ? (
          ((atk.wygrany - atk.blad - atk.zablokowany) / sumaAtakow) *
          100
        ).toFixed(1)
      : 0;
  // OBLICZENIE EFEKTYWNOŚCI SERWISU NA BAZIE POPRAWNEGO LICZNIKA ZAGRYWEK
  const efektywnoscSerwisu =
    s.zagrywki > 0 ? (((srv.as - srv.blad) / s.zagrywki) * 100).toFixed(1) : 0;

  let html = `<div class="zespol-podsumowanie">
        <h3>Zespół ${zespol} (Łączne Punkty: ${punkty}, Błędy: ${bledyWlasne}, Akcje Kontynuowane: ${atakiKontynuowane})</h3>
        <div class="zespol-stats-content">`;

  // Tabela 1: ATAK
  html += `<table class="stat-table stat-table-zespol">`;
  html +=
    '<thead><tr class="stat-category-header"><th colspan="2">ATAK ZESPOŁOWY</th></tr></thead>';
  html += `<tbody>`;
  html += `<tr><td>Atak Skuteczny (P)</td><td>${atk.wygrany}</td></tr>`;
  html += `<tr><td>Atak Kontynuowany</td><td>${atk.kontynuowany}</td></tr>`;
  html += `<tr style="color: #dc3545;"><td>Błąd w Ataku (aut)</td><td>${atk.blad}</td></tr>`;
  html += `<tr style="color: #dc3545;"><td>Atak Zablokowany</td><td>${atk.zablokowany}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Suma ataków</td><td>${sumaAtakow}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Skuteczność Ataku (P/Suma)</td><td>${procAtaku}%</td></tr>`;
  html += `<tr class="stat-percentage" style="background-color: #ccffcc; color: #008000;"><td>Efektywność Ataku (P-B-Zabl./Suma)</td><td>${efektywnoscAtaku}%</td></tr>`;
  html += `</tbody></table>`;

  // Tabela 2: PRZYJĘCIE
  html += `<table class="stat-table stat-table-zespol">`;
  html +=
    '<thead><tr class="stat-category-header"><th colspan="2">PRZYJĘCIE ZESPOŁOWE</th></tr></thead>';
  html += `<tbody>`;
  html += `<tr><td>Przyjęcie Dokładne (1)</td><td>${p[1]}</td></tr>`;
  html += `<tr><td>Przyjęcie Za 3m (2)</td><td>${p[2]}</td></tr>`;
  html += `<tr><td>Przyjęcie Niedokładne (3)</td><td>${p[3]}</td></tr>`;
  html += `<tr style="color: #dc3545;"><td>Błąd w Przyjęciu (4)</td><td>${p[4]}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Suma przyjęć</td><td>${sumaPrzyjec}</td></tr>`;
  html += `<tr class="stat-percentage" style="background-color: #ccffcc; color: #008000;"><td>% Przyjęcie Pozytywne (1 + 2)</td><td>${procPrzyjeciePozytywne}%</td></tr>`;
  html += `</tbody></table>`;

  // Tabela 3: SERWIS / BLOK
  html += `<table class="stat-table stat-table-zespol">`;
  html +=
    '<thead><tr class="stat-category-header"><th colspan="2">SERWIS / BLOK ZESPOŁOWY</th></tr></thead>';
  html += `<tbody>`;
  html += `<tr><td>As Serwisowy (Pkt)</td><td>${srv.as}</td></tr>`;
  html += `<tr style="color: #dc3545;"><td>Błąd Serwisowy</td><td>${srv.blad}</td></tr>`;
  // Dodanie zagrywek zespołu
  html += `<tr style="font-weight: bold; background-color: #fef0db;"><td>Suma Zagrywek</td><td>${s.zagrywki}</td></tr>`;
  html += `<tr class="stat-percentage" style="background-color: #ccffcc; color: #008000;"><td>Efektywność Serwisu (As-Błąd/Suma)</td><td>${efektywnoscSerwisu}%</td></tr>`;
  html += `<tr><td>Blok Punktowy (Pkt)</td><td>${blk.punktowy}</td></tr>`;
  html += `<tr><td>Dotknięcie Bloku</td><td>${blk.dotkniecie}</td></tr>`;
  html += `<tr><td style="color: #dc3545;">Błąd Bloku</td><td>${blk.blad}</td></tr>`;
  html += `</tbody></table>`;

  html += `</div>`; // .zespol-stats-content

  // Tabela 4: SZCZEGÓŁOWE STATYSTYKI ZAWODNIKÓW (POZIOM ZESPOŁU)
  html += `<h4>Szczegółowe statystyki zawodników Zespołu ${zespol} (zakres: ${
    zakres === "ALL"
      ? "Cały Mecz"
      : zakres === "CURRENT"
      ? "Aktualny Set"
      : `Set ${zakres}`
  })</h4>`;

  html += generujTabeleZawodnicy(zawodnicy, zakres);

  html += `</div>`; // .zespol-podsumowanie
  return html;
}

/**
 * Generuje tabelę zawodników do wyświetlenia w podsumowaniu zespołu (dynamiczne)
 */
function generujTabeleZawodnicy(zawodnicy, zakres) {
  let tableHTML = `
      <table class="stat-table" style="width: 100%; font-size: 0.9em;">
          <thead>
              <tr class="stat-category-header">
                  <th>Nr</th>
                  <th>Imię i Nazwisko</th>
                  <th>Atak Sk.</th>
                  <th>Efek. Ataku</th> <th>Atak Kont.</th>
                  <th>Błąd At.</th>
                  <th>Błąd Przyj.</th>
                  <th>As</th>
                  <th style="background-color: #f39c12;">Zagrywki</th>
                  <th>Błąd Serw.</th>
                  <th>Blok Pkt.</th>
                  <th>Dotk. Bloku</th>
                  <th>Obrony</th>
                  <th>Inny Błąd</th>
              </tr>
          </thead>
          <tbody>
  `;

  zawodnicy.forEach((zawodnik) => {
    const s = pobierzDaneDlaZakresu(zawodnik, zakres);

    // OBLICZANIE EFEKTYWNOŚCI ATAKU DLA ZAWODNIKA
    const sumaAtakow =
      s.atak.wygrany + s.atak.kontynuowany + s.atak.blad + s.atak.zablokowany;
    let efektywnoscAtakuWspółczynnik =
      sumaAtakow > 0
        ? (s.atak.wygrany - s.atak.blad - s.atak.zablokowany) / sumaAtakow
        : 0;
    const procEfektywnoscAtaku = (efektywnoscAtakuWspółczynnik * 100).toFixed(
      1
    );
    // KONIEC OBLICZANIA EFEKTYWNOŚCI

    tableHTML += `
          <tr>
              <td>${zawodnik.nr}</td>
              <td>${zawodnik.imie}</td>
              <td>${s.atak.wygrany}</td>
              <td style="font-weight: bold; background-color: #ccffcc; color: #008000;">${procEfektywnoscAtaku}%</td> <td>${s.atak.kontynuowany}</td>
              <td style="color: #dc3545;">${s.atak.blad}</td>
              <td style="color: #dc3545;">${s.przyjecia[4]}</td>
              <td>${s.serwis.as}</td>
              <td style="font-weight: bold; background-color: #fef0db;">${s.zagrywki}</td>
              <td style="color: #dc3545;">${s.serwis.blad}</td>
              <td>${s.blok.punktowy}</td>
              <td>${s.blok.dotkniecie}</td>
              <td>${s.obrony}</td>
              <td style="color: #dc3545;">${s.innyBlad}</td>
          </tr>
      `;
  });

  tableHTML += `
          </tbody>
      </table>
  `;
  return tableHTML;
}

/**
 * Generuje czysty HTML dla podsumowania PDF (zawiera sumy z pętli)
 */
function generujTabelePodsumowaniaPDF(
  zespół,
  statystyki,
  zawodnicy,
  punkty,
  bledyWlasne,
  atakiKontynuowane,
  nazwaSeta,
  zakres
) {
  const s = statystyki;
  const p = s.przyjecia;
  const atk = s.atak;

  const sumaPrzyjec = p[1] + p[2] + p[3] + p[4];
  const sumaAtakow =
    atk.wygrany + atk.kontynuowany + atk.blad + atk.zablokowany;

  let procAtaku =
    sumaAtakow > 0 ? ((atk.wygrany / sumaAtakow) * 100).toFixed(1) : 0;
  let efektywnoscAtaku =
    sumaAtakow > 0
      ? (
          ((atk.wygrany - atk.blad - atk.zablokowany) / sumaAtakow) *
          100
        ).toFixed(1)
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
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Atak Skuteczny (P)</td><td>${
            atk.wygrany
          }</td><td>${procAtaku}% (Skuteczność)</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Błąd Ataku + Zablokowany</td><td>${
            atk.blad + atk.zablokowany
          }</td><td>${efektywnoscAtaku}% (Efektywność)</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Asy Serwisowe</td><td>${
            s.serwis.as
          }</td><td style="font-weight: bold;">Zagrywki: ${s.zagrywki}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Błędy Serwisowe</td><td>${
            s.serwis.blad
          }</td><td></td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Blok Punktowy</td><td>${
            s.blok.punktowy
          }</td><td></td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Błędy Przyjęcia (4)</td><td>${
            p[4]
          }</td><td>${procPrzyjeciePozytywne}% (Przyjęcie Pozytywne)</td></tr>
        </tbody>
      </table>

      <h4 style="margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Indywidualne Statystyki Zawodników</h4>
      <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
        <thead style="background-color: #f2f2f2;">
          <tr>
            <th style="padding: 8px; border: 1px solid #ddd;">Nr</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Imię i Nazwisko</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Skut. Ataku</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Efek. Ataku</th>
            <th style="padding: 8px; border: 1px solid #ddd;">% Przyj. Pozyt.</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Asy</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Bł. Serwis.</th>
            <th style="padding: 8px; border: 1px solid #ddd; background-color: #f39c12;">Zagrywki</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Blok Pkt</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Obrony</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Inny Błąd</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Suma Błędów</th>
          </tr>
        </thead>
        <tbody>
  `;

  zawodnicy.forEach((zawodnik) => {
    const s = pobierzDaneDlaZakresu(zawodnik, zakres);
    const p = s.przyjecia;
    const atk = s.atak;
    const sumaAtakow =
      atk.wygrany + atk.kontynuowany + atk.blad + atk.zablokowany;
    const sumaPrzyjec = p[1] + p[2] + p[3] + p[4];
    const sumaBledow =
      p[4] +
      atk.blad +
      atk.zablokowany +
      s.serwis.blad +
      s.blok.blad +
      s.innyBlad;

    let procAtaku =
      sumaAtakow > 0 ? ((atk.wygrany / sumaAtakow) * 100).toFixed(1) : 0;
    let procEfektywnoscAtaku =
      sumaAtakow > 0
        ? (
            ((atk.wygrany - atk.blad - atk.zablokowany) / sumaAtakow) *
            100
          ).toFixed(1)
        : 0;
    let procPrzyjeciePozytywne =
      sumaPrzyjec > 0 ? (((p[1] + p[2]) / sumaPrzyjec) * 100).toFixed(1) : 0;

    html += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${zawodnik.nr}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${zawodnik.imie}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${procAtaku}%</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; background-color: #ccffcc;">${procEfektywnoscAtaku}%</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${procPrzyjeciePozytywne}%</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${s.serwis.as}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #dc3545;">${s.serwis.blad}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; background-color: #fef0db;">${s.zagrywki}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${s.blok.punktowy}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${s.obrony}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #dc3545;">${s.innyBlad}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #dc3545;">${sumaBledow}</td>
          </tr>
        `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;
  return html;
}

/**
 * Generuje cały raport PDF z podsumowaniem meczu
 */
function eksportujDoPDF() {
  const zakres = document.getElementById("zakres-setow").value;
  let nazwaZakresu = "";

  // 1. OBLICZANIE PUNKTÓW DLA WYBRANEGO ZAKRESU
  let punktyA = 0,
    punktyB = 0;

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
  const bledyWlasneA = statyA.bledyIndywidualne;
  const bledyWlasneB = statyB.bledyIndywidualne;
  const atakiKontynuowaneA = statyA.atak.kontynuowany;
  const atakiKontynuowaneB = statyB.atak.kontynuowany;

  // 2. GENEROWANIE CZYSTEGO HTML DANYCH
  let tytul = `<h1>🏐 Raport Statystyczny Siatkówka</h1>`;
  let podtytul = `<h2>${nazwaZakresu} - Wynik Zespoły A ${punktyA} : ${punktyB} Zespoły B</h2>`;
  let htmlContent = tytul + podtytul;

  htmlContent += generujTabelePodsumowaniaPDF(
    "A",
    statyA,
    zawodnicyA,
    punktyA,
    bledyWlasneA,
    atakiKontynuowaneA,
    nazwaZakresu,
    zakres
  );

  if (zawodnicyB.length > 0) {
    htmlContent += generujTabelePodsumowaniaPDF(
      "B",
      statyB,
      zawodnicyB,
      punktyB,
      bledyWlasneB,
      atakiKontynuowaneB,
      nazwaZakresu,
      zakres
    );
  }

  // 3. GENEROWANIE PDF
  const element = document.createElement("div");
  element.innerHTML = htmlContent;

  const options = {
    margin: 10,
    filename: `Raport_Statystyczny_${nazwaZakresu.replace(/\s/g, "_")}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
  };

  html2pdf().from(element).set(options).save();
}

// ====================================================================
// OBSŁUGA SKRÓTÓW KLAWISZOWYCH
// (Bez zmian)
// ====================================================================

document.addEventListener("keydown", (event) => {
  if (event.shiftKey) {
    event.preventDefault(); // Zapobiega domyślnym akcjom przeglądarki (np. Shift+Q)

    const klawiszKod = event.code;
    const klawisz = event.key.toUpperCase();

    // ----------------------------------------------------------------
    // 1. OBSŁUGA SKRÓTÓW ZAWODNIKÓW (Zawsze działają z Shift)
    // ----------------------------------------------------------------
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
        // NAPRAWIONA LOGIKA WYBORU ZAWODNIKA: Szukamy zawodnika po indeksie z listy skrótów
        const index = skrotyA.indexOf(shortcutToSearch);

        if (index !== -1 && zawodnicyA[index]) {
          const zawodnik = zawodnicyA[index];
          wybierzZawodnika(zawodnik);
          wizualnePotwierdzenie(zawodnikButton);
          return; // Obsłużono skrót zawodnika
        }
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
      G: { func: dodajAtak, args: [4, "G"] }, // Atak Zablokowany
      Z: { func: dodajAs, args: ["Z"] },
      X: { func: dodajZagrywkeKontynuowana, args: ["X"] }, // Zlicza zagrywkę, która nie była asem ani błędem
      C: { func: dodajBladSerwisowy, args: ["C"] },
      T: { func: dodajBlokPunktowy, args: ["T"] },
      Y: { func: dodajBlokDotkniecie, args: ["Y"] },
      U: { func: dodajBladBloku, args: ["U"] },
      P: { func: dodajInnyBlad, args: ["P"] },
      I: { func: dodajPunktPrzeciwnikaA, args: ["I"] },
      O: { func: dodajPunktPrzeciwnikaB, args: ["O"] },
    };

    if (mapowanieAkcji[klawisz]) {
      const akcja = mapowanieAkcji[klawisz];
      akcja.func(...akcja.args);
    }
  }
});
