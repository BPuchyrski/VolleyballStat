// ====================================================================
// ZMIENNE GLOBALNE I STRUKTURA DANYCH
// ====================================================================

// LICZNIKI DRUŻYNOWE
let punktyZespoluA = 0;
let punktyZespoluB = 0;
let atakiKontynuowaneA = 0;
let atakiKontynuowaneB = 0;
let bledyWlasneA = 0;
let bledyWlasneB = 0;

// LICZNIKI SETÓW
let setyZespoluA = 0;
let setyZespoluB = 0;
let aktualnySet = 1;
const maxSety = 5; // Mecz do 3 wygranych setów

// ZMIENNE DYNAMICZNYCH SKŁADÓW
let zawodnicyA = [];
let zawodnicyB = [];
let aktualnieWybranyZawodnik = null;

// Struktura bazowa dla statystyk nowego zawodnika
const bazaStatystyk = {
  obrony: 0,
  przyjecia: { 1: 0, 2: 0, 3: 0, 4: 0 }, // 4 to Błąd
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
 * @param {string} tekst - Tekst z numerami i nazwiskami
 * @param {string} zespol - 'A' lub 'B'
 * @returns {Array} Lista obiektów zawodników
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
          staty: JSON.parse(JSON.stringify(bazaStatystyk)),
        });
      }
    }
  });
  return lista;
}

/**
 * Dodaje i usuwa klasę, dając wizualne potwierdzenie kliknięcia.
 * @param {HTMLElement} element - Kliknięty element przycisku
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
  document.getElementById("aplikacja-statystyczna").style.display = "block";

  // Generowanie przycisków
  generujPrzyciskiZawodnicy();

  alert("Składy wczytane. Możesz zacząć statystyki!");
}

/**
 * Generuje przyciski dla każdego zawodnika w sekcjach A i B
 */
function generujPrzyciskiZawodnicy() {
  // Lista skrótów dla 14 zawodników: 1-9, 0, =, -, [, ]
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

      // Jeśli to Zespół A i jest to jeden z pierwszych 14 zawodników
      if (zespol === "A" && index < 14) {
        const klawisz = skrotyA[index];

        // Uproszczenie etykiety klawisza dla czytelności użytkownika
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

  document.getElementById("podsumowanie-zawodnika").style.display = "none";
}

// ====================================================================
// FUNKCJE DRUŻYNOWE I SETÓW
// ====================================================================

/**
 * Funkcja dodająca punkt dla wskazanego zespołu
 */
function dodajPunkt(zespol) {
  if (zespol === "A") {
    punktyZespoluA++;
    document.getElementById("punktyA").textContent = punktyZespoluA;
  } else if (zespol === "B") {
    punktyZespoluB++;
    document.getElementById("punktyB").textContent = punktyZespoluB;
  }
  sprawdzKoniecSeta();
}

/**
 * Funkcja odejmująca punkt dla wskazanego zespołu (dla celów testowych/korekty)
 */
function odejmijPunkt(zespol) {
  if (zespol === "A" && punktyZespoluA > 0) {
    punktyZespoluA--;
    document.getElementById("punktyA").textContent = punktyZespoluA;
  } else if (zespol === "B" && punktyZespoluB > 0) {
    punktyZespoluB--;
    document.getElementById("punktyB").textContent = punktyZespoluB;
  }
}

/**
 * Funkcja dodająca Atak Kontynuowany (zespołowy)
 */
function dodajAtakKontynuowany(zespol) {
  if (zespol === "A") {
    atakiKontynuowaneA++;
    document.getElementById("atakiKontynuowaneA").textContent =
      atakiKontynuowaneA;
  } else if (zespol === "B") {
    atakiKontynuowaneB++;
    document.getElementById("atakiKontynuowaneB").textContent =
      atakiKontynuowaneB;
  }
}

/**
 * Funkcja odejmująca Atak Kontynuowany (zespołowy)
 */
function odejmijAtakKontynuowany(zespol) {
  if (zespol === "A" && atakiKontynuowaneA > 0) {
    atakiKontynuowaneA--;
    document.getElementById("atakiKontynuowaneA").textContent =
      atakiKontynuowaneA;
  } else if (zespol === "B" && atakiKontynuowaneB > 0) {
    atakiKontynuowaneB--;
    document.getElementById("atakiKontynuowaneB").textContent =
      atakiKontynuowaneB;
  }
}

/**
 * Funkcja dodająca Błąd Własny (zespołowy)
 */
function dodajBladWlasny(zespol) {
  if (zespol === "A") {
    bledyWlasneA++;
    document.getElementById("bledyWlasneA").textContent = bledyWlasneA;
  } else if (zespol === "B") {
    bledyWlasneB++;
    document.getElementById("bledyWlasneB").textContent = bledyWlasneB;
  }
}

/**
 * Funkcja odejmująca Błąd Własny (zespołowy)
 */
function odejmijBladWlasny(zespol) {
  if (zespol === "A" && bledyWlasneA > 0) {
    bledyWlasneA--;
    document.getElementById("bledyWlasneA").textContent = bledyWlasneA;
  } else if (zespol === "B" && bledyWlasneB > 0) {
    bledyWlasneB--;
    document.getElementById("bledyWlasneB").textContent = bledyWlasneB;
  }
}

/**
 * Sprawdza, czy zostały osiągnięte warunki do zakończenia seta (automatycznie)
 */
function sprawdzKoniecSeta() {
  let limitPunktow = setyZespoluA + setyZespoluB + 1 === maxSety ? 15 : 25;
  let roznicaPunktow = Math.abs(punktyZespoluA - punktyZespoluB);

  let czyKoniec = false;
  let zwyciezca = null;

  if (punktyZespoluA >= limitPunktow && roznicaPunktow >= 2) {
    czyKoniec = true;
    zwyciezca = "A";
  } else if (punktyZespoluB >= limitPunktow && roznicaPunktow >= 2) {
    czyKoniec = true;
    zwyciezca = "B";
  }

  if (czyKoniec) {
    koniecSeta(zwyciezca);
  }
}

/**
 * Zapisuje wynik seta i resetuje punkty
 */
function koniecSeta(zwyciezca) {
  if (zwyciezca === "A") {
    setyZespoluA++;
    document.getElementById("setyA").textContent = setyZespoluA;
    alert(
      `Koniec Seta! Zespół A wygrywa (${punktyZespoluA}-${punktyZespoluB})`
    );
  } else if (zwyciezca === "B") {
    setyZespoluB++;
    document.getElementById("setyB").textContent = setyZespoluB;
    alert(
      `Koniec Seta! Zespół B wygrywa (${punktyZespoluB}-${punktyZespoluA})`
    );
  } else {
    return;
  }

  // Sprawdzenie, czy zakończył się mecz
  if (setyZespoluA === 3 || setyZespoluB === 3) {
    alert(
      `KONIEC MECZU! Wygrywa Zespół ${zwyciezca} wynikiem ${setyZespoluA}:${setyZespoluB}!`
    );
  }

  // Resetowanie punktów
  punktyZespoluA = 0;
  punktyZespoluB = 0;
  document.getElementById("punktyA").textContent = 0;
  document.getElementById("punktyB").textContent = 0;

  aktualnySet = setyZespoluA + setyZespoluB + 1;
  console.log(`Rozpoczęto Set ${aktualnySet}`);
}

// ====================================================================
// FUNKCJE INDYWIDUALNE (PRZYJĘCIE, OBRONA, ATAK, SERWIS, BLOK)
// =ZENIENIONE: Funkcje przyjmują teraz shortcutId zamiast eventu.
// ====================================================================

/**
 * Dodaje statystykę Przyjęcia do wybranego zawodnika
 * @param {number} typ - 1:Dokładne, 2:Za 3m, 3:Niedokładne, 4:Błąd
 * @param {string} shortcutId - Identyfikator skrótu do wizualnego potwierdzenia
 */
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
    console.log(
      `Zawodnik ${aktualnieWybranyZawodnik.imie} - Błąd w Przyjęciu!`
    );
  } else {
    console.log(
      `Zawodnik ${aktualnieWybranyZawodnik.imie} - Przyjęcie typ ${typ} dodane.`
    );
  }

  // Wizualne potwierdzenie używając data-shortcut
  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
}

/**
 * Dodaje statystykę Obrony do wybranego zawodnika
 * @param {string} shortcutId - Identyfikator skrótu do wizualnego potwierdzenia (teraz 'F')
 */
function dodajObrone(shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }

  aktualnieWybranyZawodnik.staty.obrony++;
  console.log(`Zawodnik ${aktualnieWybranyZawodnik.imie} - Obrona dodana.`);

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
}

/**
 * Dodaje statystykę Ataku do wybranego zawodnika
 * @param {number} typ - 1:Wygrany (Punkt), 2:Kontynuowany, 3:Błąd (Tracony Punkt)
 * @param {string} shortcutId - Identyfikator skrótu do wizualnego potwierdzenia (teraz 'D' dla błędu)
 */
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
    console.log(`Zawodnik ${aktualnieWybranyZawodnik.imie} - Atak Wygrany.`);
  } else if (typ === 2) {
    aktualnieWybranyZawodnik.staty.atak.kontynuowany++;
    dodajAtakKontynuowany(zespol);
    console.log(
      `Zawodnik ${aktualnieWybranyZawodnik.imie} - Atak Kontynuowany.`
    );
  } else if (typ === 3) {
    aktualnieWybranyZawodnik.staty.atak.blad++;
    dodajBladWlasny(zespol);
    dodajPunkt(przeciwnik);
    console.log(`Zawodnik ${aktualnieWybranyZawodnik.imie} - Błąd w Ataku.`);
  }

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
}

/**
 * Dodaje statystykę Asa Serwisowego
 * @param {string} shortcutId - Identyfikator skrótu do wizualnego potwierdzenia
 */
function dodajAs(shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }
  const zespol = aktualnieWybranyZawodnik.zespol;

  aktualnieWybranyZawodnik.staty.serwis.as++;
  dodajPunkt(zespol);
  console.log(`Zawodnik ${aktualnieWybranyZawodnik.imie} - As Serwisowy.`);

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
}

/**
 * Dodaje statystykę Serwisu Kontynuowanego
 * @param {string} shortcutId - Identyfikator skrótu do wizualnego potwierdzenia
 */
function dodajSerwisKontynuowany(shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }

  aktualnieWybranyZawodnik.staty.serwis.kontynuowany++;
  console.log(
    `Zawodnik ${aktualnieWybranyZawodnik.imie} - Serwis Kontynuowany.`
  );

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
}

/**
 * Dodaje statystykę Błędu Serwisowego
 * @param {string} shortcutId - Identyfikator skrótu do wizualnego potwierdzenia
 */
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
  console.log(`Zawodnik ${aktualnieWybranyZawodnik.imie} - Błąd Serwisowy.`);

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
}

/**
 * Dodaje statystykę Bloku Punktowego
 * @param {string} shortcutId - Identyfikator skrótu do wizualnego potwierdzenia
 */
function dodajBlokPunktowy(shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }
  const zespol = aktualnieWybranyZawodnik.zespol;

  aktualnieWybranyZawodnik.staty.blok.punktowy++;
  dodajPunkt(zespol);
  console.log(`Zawodnik ${aktualnieWybranyZawodnik.imie} - Blok Punktowy.`);

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
}

/**
 * Dodaje statystykę Dotknięcia Bloku (Challenge)
 * @param {string} shortcutId - Identyfikator skrótu do wizualnego potwierdzenia
 */
function dodajBlokDotkniecie(shortcutId) {
  if (!aktualnieWybranyZawodnik) {
    alert("Proszę najpierw wybrać zawodnika!");
    return;
  }

  aktualnieWybranyZawodnik.staty.blok.dotkniecie++;
  console.log(`Zawodnik ${aktualnieWybranyZawodnik.imie} - Dotknięcie Bloku.`);

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
}

/**
 * Dodaje statystykę Błędu Bloku
 * @param {string} shortcutId - Identyfikator skrótu do wizualnego potwierdzenia
 */
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
  console.log(`Zawodnik ${aktualnieWybranyZawodnik.imie} - Błąd Bloku.`);

  const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
  wizualnePotwierdzenie(button);
  pokazPodsumowanie();
}

// ====================================================================
// FUNKCJA PODSUMOWANIA I OBLICZEŃ PROCENTOWYCH
// ====================================================================

/**
 * Wyświetla aktualne statystyki wybranego zawodnika i oblicza skuteczność
 */
function pokazPodsumowanie() {
  if (!aktualnieWybranyZawodnik) {
    // Nie alertujemy tutaj, bo funkcja jest wywoływana po każdej akcji
    return;
  }

  const s = aktualnieWybranyZawodnik.staty;
  const p = s.przyjecia;
  const atk = s.atak;
  const srv = s.serwis;
  const blk = s.blok;

  // OBLICZENIA POMOCNICZE
  const sumaPrzyjec = p["1"] + p["2"] + p["3"] + p["4"];
  const sumaAtakow = atk.wygrany + atk.kontynuowany + atk.blad;
  const sumaSerwisow = srv.as + srv.kontynuowany + srv.blad;
  const sumaAkcjiBloku = blk.punktowy + blk.dotkniecie + blk.blad;

  // Suma wszystkich błędów indywidualnych
  const sumaBledowIndywidualnych = p["4"] + atk.blad + srv.blad + blk.blad;

  // Obliczenie Skuteczności Ataku (Attack Kill Percentage: Wygrane / Suma Ataków)
  let skutecznośćAtaku = 0;
  if (sumaAtakow > 0) {
    skutecznośćAtaku = atk.wygrany / sumaAtakow;
  }
  const procAtaku = (skutecznośćAtaku * 100).toFixed(1);

  // Obliczenie Procentów Przyjęcia
  let procPrzyjecieIdealne = 0;
  let procPrzyjeciePozytywne = 0;

  if (sumaPrzyjec > 0) {
    procPrzyjecieIdealne = ((p["1"] / sumaPrzyjec) * 100).toFixed(1);
    procPrzyjeciePozytywne = (((p["1"] + p["2"]) / sumaPrzyjec) * 100).toFixed(
      1
    );
  }

  // ====================================================================
  // GENEROWANIE TABELI HTML
  // ====================================================================

  document.getElementById(
    "podsumowanie-imie-nr"
  ).textContent = `${aktualnieWybranyZawodnik.imie} (Nr ${aktualnieWybranyZawodnik.nr})`;

  let html = "";

  // Tabela 1: PRZYJĘCIE
  html += '<table class="stat-table">';
  html +=
    '<thead><tr class="stat-category-header"><th colspan="2">PRZYJĘCIE</th></tr></thead>';
  html += "<tbody>";
  html += `<tr><td>1. Dokładne (do siatki)</td><td>${p["1"]}</td></tr>`;
  html += `<tr><td>2. Za 3. metr</td><td>${p["2"]}</td></tr>`;
  html += `<tr><td>3. Niedokładne (tył)</td><td>${p["3"]}</td></tr>`;
  html += `<tr><td>4. Błąd w przyjęciu</td><td>${p["4"]}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Suma przyjęć</td><td>${sumaPrzyjec}</td></tr>`;
  html += `<tr class="stat-percentage"><td>% Precyzyjne (do siatki)</td><td>${procPrzyjecieIdealne}%</td></tr>`;
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

  // Tabela 3: SERWIS
  html += '<table class="stat-table">';
  html +=
    '<thead><tr class="stat-category-header"><th colspan="2">SERWIS</th></tr></thead>';
  html += "<tbody>";
  html += `<tr><td>As Serwisowy (Punkt)</td><td>${srv.as}</td></tr>`;
  html += `<tr><td>Serwis Kontynuowany</td><td>${srv.kontynuowany}</td></tr>`;
  html += `<tr><td>Błąd Serwisowy</td><td>${srv.blad}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Suma Serwisów</td><td>${sumaSerwisow}</td></tr>`;
  html += "</tbody></table>";

  // Tabela 4: BLOK & OBRONA
  html += '<table class="stat-table">';
  html +=
    '<thead><tr class="stat-category-header"><th colspan="2">BLOK & OBRONA</th></tr></thead>';
  html += "<tbody>";
  html += `<tr><td>Blok Punktowy</td><td>${blk.punktowy}</td></tr>`;
  html += `<tr><td>Dotknięcie Bloku</td><td>${blk.dotkniecie}</td></tr>`;
  html += `<tr><td>Błąd Bloku</td><td>${blk.blad}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Suma Akcji Bloku</td><td>${sumaAkcjiBloku}</td></tr>`;
  html += `<tr class="stat-percentage"><td>Obrony</td><td>${s.obrony}</td></tr>`;
  html += "</tbody></table>";

  // Tabela 5: BŁĘDY INDYWIDUALNE
  html += '<table class="stat-table">';
  html +=
    '<thead><tr class="stat-category-header" style="background-color: #f44336;"><th colspan="2">SUMA BŁĘDÓW INDYWIDUALNYCH</th></tr></thead>';
  html += "<tbody>";
  html += `<tr><td>Błąd w Przyjęciu (4)</td><td>${p["4"]}</td></tr>`;
  html += `<tr><td>Błąd w Ataku</td><td>${atk.blad}</td></tr>`;
  html += `<tr><td>Błąd Serwisowy</td><td>${srv.blad}</td></tr>`;
  html += `<tr><td>Błąd Bloku</td><td>${blk.blad}</td></tr>`;
  html += `<tr class="stat-percentage" style="background-color: #ffcdd2;"><td>ŁĄCZNIE BŁĘDÓW</td><td>${sumaBledowIndywidualnych}</td></tr>`;
  html += "</tbody></table>";

  document.getElementById("szczegoly-zawodnika").innerHTML = html;
  document.getElementById("podsumowanie-zawodnika").style.display = "block";
}

// ====================================================================
// GLOBALNY NASŁUCH KLUCZY (WŁASNY SYSTEM SKRÓTÓW)
// ====================================================================

document.addEventListener("keydown", function (event) {
  // Sprawdzamy, czy aplikacja jest widoczna
  if (
    document.getElementById("aplikacja-statystyczna").style.display === "none"
  ) {
    return;
  }

  // Używamy event.key.toUpperCase() dla liter (Q, W, E, A, S, F, D, Z, X, C, T, Y, U)
  const klawiszSymbol = event.key.toUpperCase();
  // Używamy event.code dla klawiszy numerycznych/specjalnych (Digit1, Equal, Minus)
  const klawiszKod = event.code;

  // ----------------------------------------------------------------
  // 1. OBSŁUGA SKRÓTÓW ZAWODNIKÓW (Zawsze działają z Shift)
  // ----------------------------------------------------------------
  if (event.shiftKey) {
    let shortcutToSearch = null;

    // a) Klawisze numeryczne (1-9, 0)
    if (klawiszKod.startsWith("Digit")) {
      // Zamienia Digit1 na 1, Digit0 na 0
      shortcutToSearch = klawiszKod.slice(-1);
    }
    // b) Klawisze specjalne na końcu rzędu numerycznego
    else if (klawiszKod === "Equal") {
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
      Q: { func: dodajPrzyjecie, args: [1, "Q"] }, // Przyjęcie 1
      W: { func: dodajPrzyjecie, args: [2, "W"] }, // Przyjęcie 2
      E: { func: dodajPrzyjecie, args: [3, "E"] }, // Przyjęcie 3
      R: { func: dodajPrzyjecie, args: [4, "R"] }, // Błąd Przyjęcia
      F: { func: dodajObrone, args: ["F"] }, // ZMIENIONE: Obrona (było D)
      A: { func: dodajAtak, args: [1, "A"] }, // Atak Wygrany
      S: { func: dodajAtak, args: [2, "S"] }, // Atak Kontynuowany
      D: { func: dodajAtak, args: [3, "D"] }, // ZMIENIONE: Błąd w Ataku (było F)
      Z: { func: dodajAs, args: ["Z"] }, // As Serwisowy
      X: { func: dodajSerwisKontynuowany, args: ["X"] }, // Serwis Kontynuowany
      C: { func: dodajBladSerwisowy, args: ["C"] }, // Błąd Serwisowy
      T: { func: dodajBlokPunktowy, args: ["T"] }, // Blok Punktowy
      Y: { func: dodajBlokDotkniecie, args: ["Y"] }, // Dotknięcie Bloku
      U: { func: dodajBladBloku, args: ["U"] }, // Błąd Bloku
    };

    const akcja = mapowanieAkcji[klawiszSymbol];

    if (akcja) {
      // Wyszukujemy przycisk akcji, aby przekazać go do funkcji wizualnego potwierdzenia
      const button = document.querySelector(
        `#panel-akcji button[data-shortcut="${klawiszSymbol}"]`
      );

      // Właściwe wywołanie funkcji statystycznej
      if (button) {
        akcja.func(...akcja.args);
        event.preventDefault();
      }
    }
  }
});
