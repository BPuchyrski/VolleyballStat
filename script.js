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

// DODANO: HISTORIA PUNKTÓW DLA AKTUALNEGO SETA
let historiaPunktowAktualnegoSeta = [];

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
  aktualizujHistorieSetow(); // Inicjalizacja sekcji historii setów
  aktualizujHistoriePunktow(); // DODANO: Inicjalizacja sekcji historii punktów

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
// ====================================================================

/**
 * DODANO: Rejestruje punkt w historii punktów.
 */
function rejestrujPunkt(zdobywajacyZespol, opisAkcji, zawodnik = null) {
  const punkt = {
    zespol: zdobywajacyZespol,
    wynikA: statystykiMeczu.aktualny.punktyA,
    wynikB: statystykiMeczu.aktualny.punktyB,
    opis: opisAkcji,
    zawodnik: zawodnik ? `${zawodnik.nr} ${zawodnik.imie}` : null,
  };
  historiaPunktowAktualnegoSeta.push(punkt);
  aktualizujHistoriePunktow();
}

/**
 * Funkcja dodająca punkt dla wskazanego zespołu
 * Zmieniono, aby używała rejestrujPunkt.
 */
function dodajPunkt(zespol, opisAkcji, zawodnik = null) {
  if (zespol === "A") {
    statystykiMeczu.aktualny.punktyA++;
    document.getElementById("punktyA").textContent =
      statystykiMeczu.aktualny.punktyA;
  } else if (zespol === "B") {
    statystykiMeczu.aktualny.punktyB++;
    document.getElementById("punktyB").textContent =
      statystykiMeczu.aktualny.punktyB;
  }

  // REJESTRACJA PUNKTU W HISTORII
  rejestrujPunkt(zespol, opisAkcji, zawodnik);

  sprawdzKoniecSeta();
  pokazPodsumowanieZespolu();
}

/**
 * Funkcja dodająca punkt dla Zespołu B (gdy A popełnia błąd / jest kara)
 */
function dodajPunktPrzeciwnikaA(shortcutId) {
  dodajPunkt("B", "Punkt dla Zespołu B (kara dla Zespołu A)");
  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
}

/**
 * Funkcja dodająca punkt dla Zespołu A (gdy B popełnia błąd / jest kara)
 */
function dodajPunktPrzeciwnikaB(shortcutId) {
  dodajPunkt("A", "Punkt dla Zespołu A (kara dla Zespołu B)");
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
    // DODANO: Zapis historii punktów zakończonego seta
    historiaPunktow: JSON.parse(JSON.stringify(historiaPunktowAktualnegoSeta)),
  };
  statystykiMeczu.sety.push(statystykiSeta);

  // 2. ZAPISYWANIE STATYSTYK INDYWIDUALNYCH ZAWODNIKÓW
  [...zawodnicyA, ...zawodnicyB].forEach((zawodnik) => {
    // Zapisz statystyki z AKTUALNEGO seta do historii
    zawodnik.historiaSetow.push(JSON.parse(JSON.stringify(zawodnik.staty)));

    // Zresetuj statystyki dla nowego seta
    zawodnik.staty = JSON.parse(JSON.stringify(bazaStatystyk));
  });

  // 3. RESETOWANIE PUNKTÓW ZESPOŁOWYCH I HISTORII PUNKTÓW DLA NOWEGO SETA
  statystykiMeczu.aktualny = {
    punktyA: 0,
    punktyB: 0,
    atakiKontynuowaneA: 0,
    atakiKontynuowaneB: 0,
    bledyWlasneA: 0,
    bledyWlasneB: 0,
  };
  historiaPunktowAktualnegoSeta = []; // RESET HISTORII PUNKTÓW

  document.getElementById("punktyA").textContent = 0;
  document.getElementById("punktyB").textContent = 0;
  document.getElementById("atakiKontynuowaneA").textContent = 0;
  document.getElementById("atakiKontynuowaneB").textContent = 0;
  document.getElementById("bledyWlasneA").textContent = 0;
  document.getElementById("bledyWlasneB").textContent = 0;

  // 4. AKTUALIZACJA LICZNIKA SETA I LISTY WYBORU
  aktualnyNumerSeta = setyZespoluA + setyZespoluB + 1;
  aktualizujListeSetow();
  aktualizujHistorieSetow();
  aktualizujHistoriePunktow(); // Aktualizacja sekcji historii punktów (powinna być pusta)

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

/**
 * Aktualizuje sekcję "Historia Punktów" na dole strony.
 */
function aktualizujHistoriePunktow() {
  const kontener = document.getElementById("lista-punktow");
  if (!kontener) return; // Zabezpieczenie na wypadek braku elementu

  let html = "";
  const punktyDoWyswietlenia = historiaPunktowAktualnegoSeta;

  if (punktyDoWyswietlenia.length === 0) {
    kontener.innerHTML = "<p>Brak punktów w aktualnym secie.</p>";
    return;
  }

  // Wyświetlanie listy od najnowszego (odwracamy tablicę)
  const odwroconaLista = [...punktyDoWyswietlenia].reverse();

  html += '<ul style="list-style-type: none; padding-left: 0;">';
  odwroconaLista.forEach((punkt) => {
    const styl = punkt.zespol === "A" ? "color: #3498db;" : "color: #e74c3c;";
    const zawodnikInfo = punkt.zawodnik ? `(Zaw. ${punkt.zawodnik})` : "";

    html += `<li style="margin-bottom: 5px; padding: 8px; border-radius: 4px; background-color: #f8f8f8; border-left: 5px solid ${
      punkt.zespol === "A" ? "#3498db" : "#e74c3c"
    };">`;
    html += `<strong style="${styl}">[${punkt.wynikA} : ${punkt.wynikB}] Zespół ${punkt.zespol}:</strong> ${punkt.opis} ${zawodnikInfo}`;
    html += `</li>`;
  });
  html += "</ul>";

  kontener.innerHTML = html;
}

/**
 * Aktualizuje sekcję "Historia Setów" na dole strony.
 */
function aktualizujHistorieSetow() {
  const kontener = document.getElementById("lista-historia");
  let html = "";

  if (statystykiMeczu.sety.length === 0) {
    kontener.innerHTML = "<p>Brak zakończonych setów do wyświetlenia.</p>";
    return;
  }

  html += '<ul style="list-style-type: none; padding-left: 0;">';
  statystykiMeczu.sety.forEach((set) => {
    const styl =
      set.zwyciezca === "A"
        ? "font-weight: bold; color: #3498db;"
        : "font-weight: bold; color: #e74c3c;";
    const wynik = `${set.wynik.punktyA} - ${set.wynik.punktyB}`;

    html += `<li style="margin-bottom: 8px; padding: 10px; border-radius: 5px; background-color: #ecf0f1;">`;
    html += `<strong>Set ${set.numer}:</strong> `;
    html += `Wynik: <span style="${styl}">${wynik}</span>. Zwycięzca: Zespół ${set.zwyciezca}`;
    html += `</li>`;
  });
  html += "</ul>";

  kontener.innerHTML = html;
}

// ====================================================================
// FUNKCJE INDYWIDUALNE (Zaktualizowane o rejestrację punktu)
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
    // Błąd Przyjęcia (Punkt dla Przeciwnika)
    dodajPunkt(przeciwnik, "Błąd w Przyjęciu", aktualnieWybranyZawodnik);
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
    dodajPunkt(zespol, "Atak Skuteczny", aktualnieWybranyZawodnik);
  } else if (typ === 2) {
    // Atak Kontynuowany
    aktualnieWybranyZawodnik.staty.atak.kontynuowany++;
    dodajAtakKontynuowany(zespol);
  } else if (typ === 3) {
    // Błąd Ataku (aut)
    aktualnieWybranyZawodnik.staty.atak.blad++;
    dodajBladWlasny(zespol);
    dodajPunkt(przeciwnik, "Błąd w Ataku (aut)", aktualnieWybranyZawodnik);
  } else if (typ === 4) {
    // Atak Zablokowany
    aktualnieWybranyZawodnik.staty.atak.zablokowany++;
    dodajBladWlasny(zespol);
    dodajPunkt(przeciwnik, "Atak Zablokowany", aktualnieWybranyZawodnik);
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
  dodajPunkt(zespol, "As Serwisowy", aktualnieWybranyZawodnik);

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
  dodajPunkt(przeciwnik, "Błąd Serwisowy", aktualnieWybranyZawodnik);

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
  dodajPunkt(zespol, "Blok Punktowy", aktualnieWybranyZawodnik);

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
  dodajPunkt(przeciwnik, "Błąd Bloku", aktualnieWybranyZawodnik);

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
  dodajPunkt(
    przeciwnik,
    "Inny Błąd (siatka/przejście)",
    aktualnieWybranyZawodnik
  ); // Punkt dla przeciwnika

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
  pokazPodsumowanieZespolu();
}

// ====================================================================
// FUNKCJE OBLICZEŃ I WYŚWIETLANIA (bez zmian)
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
  html += `<tr class="stat-percentage" style="font-weight: bold; background-color: #f8f8f8;"><td>Suma Ataków</td><td>${sumaAtakow}</td></tr>`;
  html += `<tr class="stat-percentage" style="background-color: #ccffcc; color: #008000;"><td>Skuteczność (%)</td><td>${procAtaku}%</td></tr>`;
  html += `<tr class="stat-percentage" style="background-color: #aaffaa; color: #008000;"><td>Efektywność (%)</td><td>${procEfektywnoscAtaku}%</td></tr>`;
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

    // Suma Błędów Indywidualnych dla zespołu
    suma.bledyIndywidualne +=
      s.przyjecia["4"] +
      s.atak.blad +
      s.atak.zablokowany +
      s.serwis.blad +
      s.blok.blad +
      s.innyBlad;
  });

  return suma;
}

/**
 * Wyświetla sumę statystyk dla Zespołu A i B.
 */
function pokazPodsumowanieZespolu() {
  const zakres = document.getElementById("zakres-setow").value;
  let punktyA = statystykiMeczu.aktualny.punktyA;
  let punktyB = statystykiMeczu.aktualny.punktyB;
  let setWybrany = null;

  const statyA = obliczStatystykiZespolu(zawodnicyA);
  const statyB = obliczStatystykiZespolu(zawodnicyB);

  // W przypadku ALL lub Konkretnego Seta, musimy pobrać punkty z historii
  if (zakres !== "CURRENT") {
    // 1. Obliczanie punktów
    if (zakres === "ALL") {
      // Sumowanie punktów z historii setów
      statystykiMeczu.sety.forEach((set) => {
        punktyA += set.wynik.punktyA;
        punktyB += set.wynik.punktyB;
      });
      // Dodanie punktów z aktualnego seta
      punktyA += statystykiMeczu.aktualny.punktyA;
      punktyB += statystykiMeczu.aktualny.punktyB;
    } else {
      // Konkretny set (numer)
      setWybrany = statystykiMeczu.sety.find(
        (set) => set.numer === parseInt(zakres)
      );

      if (setWybrany) {
        // Zakończony set: bierzemy punkty z historii
        punktyA = setWybrany.wynik.punktyA;
        punktyB = setWybrany.wynik.punktyB;
      } else if (parseInt(zakres) === aktualnyNumerSeta) {
        // Aktualny set wybrany z opcji (po zakończeniu seta)
        punktyA = statystykiMeczu.aktualny.punktyA;
        punktyB = statystykiMeczu.aktualny.punktyB;
      } else {
        // Set nie istnieje (np. wybrano Set 3, a mecz jest w Secie 1)
        punktyA = 0;
        punktyB = 0;
      }
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

  // Obliczenie Efektywności Serwisu (As - Błąd) / Suma Zagrywek
  const efektywnoscSerwisu =
    s.zagrywki > 0 ? (((srv.as - srv.blad) / s.zagrywki) * 100).toFixed(1) : 0;

  let html = `<div class="zespol-podsumowanie">`;
  html += `<h3>Zespół ${zespol} - Punkty: ${punkty}</h3>`;
  html += `<p style="font-weight: bold; font-size: 0.9em;">Ataki Kontynuowane: ${atakiKontynuowane} | Błędy Własne (Indywidualne): ${bledyWlasne}</p>`;
  html += `<div class="zespol-stats-content">`;

  // Tabela 1: ATAK ZESPOŁOWY
  html += `<table class="stat-table stat-table-zespol">`;
  html +=
    '<thead><tr class="stat-category-header"><th colspan="2">ATAK ZESPOŁOWY</th></tr></thead>';
  html += `<tbody>`;
  html += `<tr><td>Atak Skuteczny (Pkt)</td><td>${atk.wygrany}</td></tr>`;
  html += `<tr><td>Atak Kontynuowany</td><td>${atk.kontynuowany}</td></tr>`;
  html += `<tr><td style="color: #dc3545;">Błąd Ataku</td><td>${atk.blad}</td></tr>`;
  html += `<tr><td style="color: #dc3545;">Atak Zablokowany</td><td>${atk.zablokowany}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Suma Ataków</td><td>${sumaAtakow}</td></tr>`;
  html += `<tr class="stat-percentage" style="background-color: #ccffcc; color: #008000;"><td>Skuteczność (%)</td><td>${procAtaku}%</td></tr>`;
  html += `<tr class="stat-percentage" style="background-color: #aaffaa; color: #008000;"><td>Efektywność (%)</td><td>${efektywnoscAtaku}%</td></tr>`;
  html += `</tbody></table>`;

  // Tabela 2: PRZYJĘCIE ZESPOŁOWE
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
    <table class="stat-table" style="width: 100%; font-size: 0.8em;">
      <thead style="background-color: #f1f1f1; font-weight: bold;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">Nr</td>
          <td style="padding: 8px; border: 1px solid #ddd;">Imię i Nazwisko</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Skut. Ataku (%)</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; background-color: #ccffcc;">Efek. Ataku (%)</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Przyj. Poz. (%)</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Asy</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #dc3545;">Bł. Serwisowy</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; background-color: #fef0db;">Zagrywki Total</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Blok Pkt.</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Obrona</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #dc3545;">Suma Błędów</td>
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

    tableHTML += `
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
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #dc3545;">${sumaBledow}</td>
      </tr>
    `;
  });

  tableHTML += `</tbody></table>`;
  return tableHTML;
}

// ====================================================================
// EKSPORT DO PDF (bez zmian)
// ====================================================================

function eksportujDoPDF() {
  const zakres = document.getElementById("zakres-setow").value;
  let nazwaZakresu = "Raport";
  let punktyA = statystykiMeczu.aktualny.punktyA;
  let punktyB = statystykiMeczu.aktualny.punktyB;

  if (zakres === "ALL") {
    nazwaZakresu = "CalyMecz";
    // Sumowanie punktów z całej historii setów + aktualny
    statystykiMeczu.sety.forEach((set) => {
      punktyA += set.wynik.punktyA;
      punktyB += set.wynik.punktyB;
    });
  } else if (zakres === "CURRENT") {
    nazwaZakresu = `Set${aktualnyNumerSeta}`;
  } else {
    // Konkretny set z historii
    nazwaZakresu = `Set${zakres}`;
    const setWybrany = statystykiMeczu.sety.find(
      (set) => set.numer === parseInt(zakres)
    );
    if (setWybrany) {
      punktyA = setWybrany.wynik.punktyA;
      punktyB = setWybrany.wynik.punktyB;
    }
  }

  // 1. OBLICZANIE GLOBALNYCH STATYSTYK ZESPOŁOWYCH (bazuje na statystykach indywidualnych z danego zakresu)
  const statyA = obliczStatystykiZespolu(zawodnicyA);
  const statyB = obliczStatystykiZespolu(zawodnicyB);
  const bledyWlasneA = statyA.bledyIndywidualne;
  const bledyWlasneB = statyB.bledyIndywidualne;
  const atakiKontynuowaneA = statyA.atak.kontynuowany;
  const atakiKontynuowaneB = statyB.atak.kontynuowany;

  // 2. GENEROWANIE CZYSTEGO HTML DANYCH
  let tytul = `<h1>🏐 Raport Statystyczny Siatkówka</h1>`;
  let podtytul = `<h2>${nazwaZakresu} - Wynik Zespół A ${punktyA} : ${punktyB} Zespół B</h2>`;
  let htmlContent = tytul + podtytul;

  // Podsumowanie Zespołu A
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

  // Podsumowanie Zespołu B
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
    filename: `Raport_Statystyczny_${nazwaZakresu.replace(/\s/g, "")}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  html2pdf().from(element).set(options).save();
}

/**
 * Generuje HTML podsumowania zespołu do użytku w PDF (wersja uproszczona/stylizowana inline)
 */
function generujTabelePodsumowaniaPDF(
  zespół,
  s,
  listaZawodnicy,
  punkty,
  bledyWlasne,
  atakiKontynuowane,
  nazwaSeta,
  zakres
) {
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
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Przyjęcie Pozytywne (1+2)</td><td>${
            p[1] + p[2]
          }</td><td>${procPrzyjeciePozytywne}%</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Blok Punktowy</td><td>${
            s.blok.punktowy
          }</td><td style="font-weight: bold;">Obrony: ${s.obrony}</td></tr>
        </tbody>
      </table>
      ${generujTabeleZawodnicyPDF(listaZawodnicy, zakres)}
    </div>
  `;
  return html;
}

/**
 * Generuje HTML tabeli zawodników dla PDF (wersja uproszczona/stylizowana inline)
 */
function generujTabeleZawodnicyPDF(zawodnicy, zakres) {
  let tableHTML = `
    <h4 style="margin-top: 15px; border-bottom: 1px solid #ccc;">Szczegóły Zawodników</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 0.7em;">
      <thead style="background-color: #ecf0f1; font-weight: bold;">
        <tr>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">Nr</td>
          <td style="padding: 6px; border: 1px solid #ddd;">Imię i Nazwisko</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Skut. Ataku (%)</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Efek. Ataku (%)</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Przyj. Poz. (%)</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Asy</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Bł. Serwisowy</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Blok Pkt.</td>
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

    tableHTML += `
      <tr>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${zawodnik.nr}</td>
        <td style="padding: 6px; border: 1px solid #ddd;">${zawodnik.imie}</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${procAtaku}%</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${procEfektywnoscAtaku}%</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${procPrzyjeciePozytywne}%</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${s.serwis.as}</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: #dc3545;">${s.serwis.blad}</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${s.blok.punktowy}</td>
      </tr>
    `;
  });

  tableHTML += `</tbody></table>`;
  return tableHTML;
}

// ====================================================================
// OBSŁUGA SKRÓTÓW KLWIATUROWYCH (bez zmian)
// ====================================================================

document.addEventListener("keydown", (event) => {
  // Sprawdzenie, czy wciśnięty został klawisz Shift
  if (!event.shiftKey) return;

  const key = event.key.toUpperCase();

  // ----------------------------------------------------------------
  // 1. OBSŁUGA SKRÓTÓW ZAWODNIKÓW (Shift + 1, 2, 3...)
  // ----------------------------------------------------------------
  const index = skrotyA.indexOf(key);
  if (index !== -1 && index < zawodnicyA.length) {
    // Klawisz odpowiada zawodnikowi Zespołu A
    const zawodnik = zawodnicyA[index];
    wybierzZawodnika(zawodnik);

    const zawodnikButton = document.getElementById(
      `zawodnik-${zawodnik.zespol}-${zawodnik.nr}`
    );
    if (zawodnikButton) {
      wizualnePotwierdzenie(zawodnikButton);
    }
    return; // Obsłużono skrót zawodnika
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
    X: { func: dodajSerwisKontynuowany, args: ["X"] }, // Zmieniona nazwa funkcji
    C: { func: dodajBladSerwisowy, args: ["C"] },

    T: { func: dodajBlokPunktowy, args: ["T"] },
    Y: { func: dodajBlokDotkniecie, args: ["Y"] },
    U: { func: dodajBladBloku, args: ["U"] },
    P: { func: dodajInnyBlad, args: ["P"] },

    I: { func: dodajPunktPrzeciwnikaA, args: ["I"] },
    O: { func: dodajPunktPrzeciwnikaB, args: ["O"] },
  };

  const akcja = mapowanieAkcji[key];

  if (akcja) {
    // Sprawdzenie, czy akcja jest związana ze statystykami zawodnika
    const wymagaZawodnika = !["I", "O"].includes(key); // I, O nie wymaga zawodnika

    if (wymagaZawodnika && !aktualnieWybranyZawodnik) {
      alert("Proszę najpierw wybrać zawodnika!");
      return;
    }
    event.preventDefault(); // Zapobieganie domyślnej akcji przeglądarki (np. Shift + R)
    akcja.func(...akcja.args); // Wywołanie funkcji z argumentami
  }
});
