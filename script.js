// ====================================================================
// ZMIENNE GLOBALNE I STRUKTURA DANYCH
// ====================================================================

let zawodnicyA = [];
let zawodnicyB = [];
let aktualnieWybranyZawodnik = null;
let aktualnieWybranyZespol = null;

let punktyZespoluA = 0;
let punktyZespoluB = 0;
let setyZespoluA = 0;
let setyZespoluB = 0;

let atakiKontynuowaneA = 0;
let atakiKontynuowaneB = 0;
let bledyWlasneA = 0;
let bledyWlasneB = 0;

// ZMIENNA PRZECHOWUJĄCA AKTUALNIE OBLICZANY SET
let aktualnySet = 1;
const maxSety = 5; 
const punktacjaSet = 25; // Domyślna punktacja
const przewagaSet = 2;   // Domyślna przewaga

// STRUKTURA BAZOWA DLA STATYSTYK NA JEDEN SET
const bazaStatystykSeta = {
    obrony: 0, 
    przyjecia: { '1': 0, '2': 0, '3': 0, '4': 0 }, // 4 to Błąd
    atak: { wygrany: 0, kontynuowany: 0, blad: 0 },
    serwis: { 
        as: 0, 
        kontynuowany: 0, // Zagrywka przyjęta
        blad: 0 
    },
    blok: { punktowy: 0, dotkniecie: 0, blad: 0 }
};


// ====================================================================
// FUNKCJE POMOCNICZE I START APLIKACJI
// ====================================================================

/**
 * Parsuje skład wprowadzony przez użytkownika.
 * Statystyki są inicjalizowane w strukturze statyNaSety.
 */
function parsujSklad(tekst, zespol) {
    const lista = [];
    const linie = tekst.split('\n').filter(line => line.trim() !== ''); 

    linie.forEach(linia => {
        const czesci = linia.trim().split(/\s+/); 
        
        if (czesci.length >= 2) {
            const nr = parseInt(czesci[0]);
            const imie = czesci.slice(1).join(' '); 
            
            if (!isNaN(nr) && imie) {
                lista.push({
                    nr: nr,
                    imie: imie,
                    zespol: zespol,
                    statyNaSety: {
                        // Inicjalizacja dla Seta 1 z kopii bazy
                        '1': JSON.parse(JSON.stringify(bazaStatystykSeta)) 
                    }
                });
            }
        }
    });
    return lista;
}

/**
 * Inicjuje mecz, wczytuje składy i przełącza widok.
 */
function inicjujMecz() {
    const skladA = document.getElementById('skladA').value;
    const skladB = document.getElementById('skladB').value;

    zawodnicyA = parsujSklad(skladA, 'A');
    zawodnicyB = parsujSklad(skladB, 'B');

    if (zawodnicyA.length === 0 || zawodnicyB.length === 0) {
        alert("Proszę wprowadzić składy obu zespołów.");
        return;
    }

    resetLiczniki();
    aktualnySet = 1;
    document.getElementById('aktualny-set-display').textContent = aktualnySet;
    
    // Generowanie przycisków
    generujPrzyciskiZawodnicy();
    
    // Generowanie selektora setów po raz pierwszy
    generujSelektorSetow();

    document.getElementById('konfiguracja-skladu').style.display = 'none';
    document.getElementById('aplikacja-statystyczna').style.display = 'block';

    alert("Składy wczytane. Możesz zacząć statystykować!");
}

/**
 * Resetuje wszystkie globalne liczniki.
 */
function resetLiczniki() {
    punktyZespoluA = 0;
    punktyZespoluB = 0;
    setyZespoluA = 0;
    setyZespoluB = 0;
    atakiKontynuowaneA = 0;
    atakiKontynuowaneB = 0;
    bledyWlasneA = 0;
    bledyWlasneB = 0;
    aktualnieWybranyZawodnik = null;
    
    // Aktualizacja widoków
    aktualizujWyswietlaneDane();
    document.getElementById('wybrany-zawodnik-info').textContent = 'Nikt nie wybrany';
    document.getElementById('podsumowanie-zawodnika').style.display = 'none';
}


/**
 * Wizualnie potwierdza kliknięcie przycisku.
 */
function wizualnePotwierdzenie(button) {
    button.classList.add('clicked-feedback');
    setTimeout(() => {
        button.classList.remove('clicked-feedback');
    }, 100);
}


/**
 * Używana w funkcjach dodających statystyki.
 * Zwraca obiekt statystyk dla aktualnie wybranego zawodnika i aktywnego seta.
 * Inicjalizuje set, jeśli statystyki dla niego jeszcze nie istnieją.
 * @returns {object} Obiekt statystyk aktualnego seta lub null.
 */
function getAktywneStatystyki() {
    if (!aktualnieWybranyZawodnik) {
        return null;
    }
    const set = aktualnySet.toString();

    if (!aktualnieWybranyZawodnik.statyNaSety[set]) {
        // Jeśli statystyki dla tego seta nie istnieją, stwórz je na podstawie bazy
        aktualnieWybranyZawodnik.statyNaSety[set] = JSON.parse(JSON.stringify(bazaStatystykSeta));
    }
    return aktualnieWybranyZawodnik.statyNaSety[set];
}

// ====================================================================
// FUNKCJE OBSŁUGI PUNKTACJI I SETÓW
// ====================================================================

function dodajPunkt(zespol) {
    if (zespol === 'A') {
        punktyZespoluA++;
    } else if (zespol === 'B') {
        punktyZespoluB++;
    }
    aktualizujWyswietlaneDane();
    sprawdzKoniecSeta();
}

function dodajAtakKontynuowany(zespol) {
    if (zespol === 'A') {
        atakiKontynuowaneA++;
    } else if (zespol === 'B') {
        atakiKontynuowaneB++;
    }
    aktualizujWyswietlaneDane();
}

function dodajBladWlasny(zespol) {
    if (zespol === 'A') {
        bledyWlasneA++;
    } else if (zespol === 'B') {
        bledyWlasneB++;
    }
    aktualizujWyswietlaneDane();
}

/**
 * Sprawdza warunki zakończenia seta.
 */
function sprawdzKoniecSeta() {
    const roznica = Math.abs(punktyZespoluA - punktyZespoluB);

    if (punktyZespoluA >= punktacjaSet && roznica >= przewagaSet) {
        koniecSeta('A');
    } else if (punktyZespoluB >= punktacjaSet && roznica >= przewagaSet) {
        koniecSeta('B');
    }
}

/**
 * Obsługuje logikę zakończenia seta.
 */
function koniecSeta(zwyciezca) {
    if (zwyciezca === 'A') {
        setyZespoluA++;
        alert(`Koniec Seta ${aktualnySet}! Wygrywa Zespół A.`);
    } else {
        setyZespoluB++;
        alert(`Koniec Seta ${aktualnySet}! Wygrywa Zespół B.`);
    }

    // Resetowanie punktów do 0 dla nowego seta
    punktyZespoluA = 0;
    punktyZespoluB = 0;
    
    aktualizujWyswietlaneDane();
    
    // Zwiększamy licznik seta i aktualizujemy wyświetlanie
    aktualnySet = setyZespoluA + setyZespoluB + 1;
    document.getElementById('aktualny-set-display').textContent = aktualnySet;
    
    if (aktualnySet <= maxSety) {
        generujSelektorSetow(); // Dodaj nową opcję seta
    }

    sprawdzKoniecMeczu();
}

/**
 * Sprawdza, czy mecz się skończył (3 wygrane sety).
 */
function sprawdzKoniecMeczu() {
    if (setyZespoluA === 3) {
        alert("KONIEC MECZU! Zespół A wygrywa 3: " + setyZespoluB);
        // Można tu dodać logikę blokującą dalsze statystykowanie
    } else if (setyZespoluB === 3) {
        alert("KONIEC MECZU! Zespół B wygrywa 3: " + setyZespoluA);
        // Można tu dodać logikę blokującą dalsze statystykowanie
    }
}


/**
 * Odświeża liczniki punktów, setów i statystyk zespołowych w interfejsie.
 */
function aktualizujWyswietlaneDane() {
    document.getElementById('punktyA').textContent = punktyZespoluA;
    document.getElementById('punktyB').textContent = punktyZespoluB;
    document.getElementById('setyA').textContent = setyZespoluA;
    document.getElementById('setyB').textContent = setyZespoluB;
    document.getElementById('atakiKontynuowaneA').textContent = atakiKontynuowaneA;
    document.getElementById('atakiKontynuowaneB').textContent = atakiKontynuowaneB;
    document.getElementById('bledyWlasneA').textContent = bledyWlasneA;
    document.getElementById('bledyWlasneB').textContent = bledyWlasneB;
}

// ====================================================================
// FUNKCJE OBSŁUGI WYBORU SETA
// ====================================================================

/**
 * Zmienia aktywny set i odświeża interfejs.
 */
function zmienAktywnySet(nowySet) {
    nowySet = parseInt(nowySet);
    if (isNaN(nowySet) || nowySet < 1 || nowySet > maxSety) {
        console.error("Nieprawidłowy numer seta.");
        return;
    }
    aktualnySet = nowySet;
    document.getElementById('aktualny-set-display').textContent = nowySet;
    
    // Po zmianie seta, zawsze odświeżamy widok podsumowania zawodnika (jeśli jest wybrany)
    pokazPodsumowanie();
    
    console.log(`Zmieniono aktywny set na: ${aktualnySet}`);
}

/**
 * Generuje opcje dla selektora setów.
 */
function generujSelektorSetow() {
    const selector = document.getElementById('set-selector');
    // Liczba setów do wyboru to aktualna liczba rozpoczętych setów
    const biezacaLiczbaSetow = setyZespoluA + setyZespoluB + 1;
    
    selector.innerHTML = '';
    
    for (let i = 1; i <= Math.min(biezacaLiczbaSetow, maxSety); i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Set ${i}`;
        
        if (i === aktualnySet) {
            option.selected = true;
        }
        selector.appendChild(option);
    }
}


// ====================================================================
// FUNKCJE OBSŁUGI ZAWODNIKÓW I WYBORU
// ====================================================================

function generujPrzyciskiZawodnicy() {
    const kontenerA = document.getElementById('zawodnicyA');
    const kontenerB = document.getElementById('zawodnicyB');
    kontenerA.innerHTML = '';
    kontenerB.innerHTML = '';

    const zawodnicy = [...zawodnicyA, ...zawodnicyB];

    zawodnicy.forEach((zaw, index) => {
        const button = document.createElement('button');
        button.textContent = `${zaw.nr} - ${zaw.imie}`;
        button.onclick = () => wybierzZawodnika(zaw);
        button.dataset.index = index;
        
        // Dodawanie skrótów klawiszowych dla zawodników Zespołu A (1, 2, 3...)
        if (zaw.zespol === 'A' && index < 9) {
            button.dataset.shortcut = (index + 1).toString();
        }

        if (zaw.zespol === 'A') {
            kontenerA.appendChild(button);
        } else {
            kontenerB.appendChild(button);
        }
    });
}


function wybierzZawodnika(zawodnik) {
    // Resetuj style poprzedniego aktywnego przycisku
    const aktywnyButton = document.querySelector('.zawodnik-aktywny');
    if (aktywnyButton) {
        aktywnyButton.classList.remove('zawodnik-aktywny');
    }

    // Ustaw nowego aktywnego zawodnika
    aktualnieWybranyZawodnik = zawodnik;
    aktualnieWybranyZespol = zawodnik.zespol;
    
    // Ustaw styl dla klikniętego przycisku
    const przyciski = document.querySelectorAll('#zawodnicyA button, #zawodnicyB button');
    przycisk = Array.from(przyciskis).find(btn => btn.textContent === `${zawodnik.nr} - ${zawodnik.imie}`);
    if (przycisk) {
        przycisk.classList.add('zawodnik-aktywny');
    }

    document.getElementById('wybrany-zawodnik-info').textContent = `${zawodnik.nr} ${zawodnik.imie} (${zawodnik.zespol})`;
    
    // Zawsze wyświetlaj podsumowanie po wyborze zawodnika
    pokazPodsumowanie();
}


// ====================================================================
// FUNKCJE DODAJĄCE STATYSTYKI (ZAKTUALIZOWANE DO OBSŁUGI SETÓW)
// ====================================================================

function dodajPrzyjecie(typ, shortcutId) {
    const aktywneStaty = getAktywneStatystyki();
    if (!aktywneStaty) {
        alert("Proszę najpierw wybrać zawodnika!");
        return;
    }
    const zespol = aktualnieWybranyZawodnik.zespol;
    const przeciwnik = (zespol === 'A') ? 'B' : 'A';
    
    aktywneStaty.przyjecia[typ.toString()]++; 
    
    if (typ === 4) {
        dodajPunkt(przeciwnik);
        dodajBladWlasny(zespol);
    } 

    const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
    wizualnePotwierdzenie(button);
    pokazPodsumowanie(); 
}

function dodajObrone(shortcutId) {
    const aktywneStaty = getAktywneStatystyki();
    if (!aktywneStaty) {
        alert("Proszę najpierw wybrać zawodnika!");
        return;
    }
    
    aktywneStaty.obrony++; 
    
    const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
    wizualnePotwierdzenie(button);
    pokazPodsumowanie();
}

function dodajAtak(typ, shortcutId) {
    const aktywneStaty = getAktywneStatystyki();
    if (!aktywneStaty) {
        alert("Proszę najpierw wybrać zawodnika!");
        return;
    }
    const zespol = aktualnieWybranyZawodnik.zespol; 
    const przeciwnik = (zespol === 'A') ? 'B' : 'A';

    if (typ === 1) { // Atak Wygrany (Punkt)
        aktywneStaty.atak.wygrany++; 
        dodajPunkt(zespol);
    } else if (typ === 2) { // Atak Kontynuowany (Brak punktu, trwa akcja)
        aktywneStaty.atak.kontynuowany++; 
        dodajAtakKontynuowany(zespol);
    } else if (typ === 3) { // Błąd w Ataku
        aktywneStaty.atak.blad++; 
        dodajBladWlasny(zespol);
        dodajPunkt(przeciwnik);
    }

    const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
    wizualnePotwierdzenie(button);
    pokazPodsumowanie();
}

function dodajAs(shortcutId) {
    const aktywneStaty = getAktywneStatystyki();
    if (!aktywneStaty) {
        alert("Proszę najpierw wybrać zawodnika!");
        return;
    }
    const zespol = aktualnieWybranyZawodnik.zespol;
    
    aktywneStaty.serwis.as++;
    dodajPunkt(zespol);
    
    const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
    wizualnePotwierdzenie(button);
    pokazPodsumowanie();
}

function dodajSerwisKontynuowany(shortcutId) {
    const aktywneStaty = getAktywneStatystyki();
    if (!aktywneStaty) {
        alert("Proszę najpierw wybrać zawodnika!");
        return;
    }
    
    aktywneStaty.serwis.kontynuowany++;
    
    const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
    wizualnePotwierdzenie(button);
    pokazPodsumowanie();
}

function dodajBladSerwisowy(shortcutId) {
    const aktywneStaty = getAktywneStatystyki();
    if (!aktywneStaty) {
        alert("Proszę najpierw wybrać zawodnika!");
        return;
    }
    const zespol = aktualnieWybranyZawodnik.zespol;
    const przeciwnik = (zespol === 'A') ? 'B' : 'A';
    
    aktywneStaty.serwis.blad++;
    dodajBladWlasny(zespol);
    dodajPunkt(przeciwnik);
    
    const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
    wizualnePotwierdzenie(button);
    pokazPodsumowanie();
}

function dodajBlokPunktowy(shortcutId) {
    const aktywneStaty = getAktywneStatystyki();
    if (!aktywneStaty) {
        alert("Proszę najpierw wybrać zawodnika!");
        return;
    }
    const zespol = aktualnieWybranyZawodnik.zespol;
    
    aktywneStaty.blok.punktowy++;
    dodajPunkt(zespol);
    
    const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
    wizualnePotwierdzenie(button);
    pokazPodsumowanie();
}

function dodajBlokDotkniecie(shortcutId) {
    const aktywneStaty = getAktywneStatystyki();
    if (!aktywneStaty) {
        alert("Proszę najpierw wybrać zawodnika!");
        return;
    }
    
    aktywneStaty.blok.dotkniecie++;
    
    const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
    wizualnePotwierdzenie(button);
    pokazPodsumowanie();
}

function dodajBladBloku(shortcutId) {
    const aktywneStaty = getAktywneStatystyki();
    if (!aktywneStaty) {
        alert("Proszę najpierw wybrać zawodnika!");
        return;
    }
    const zespol = aktualnieWybranyZawodnik.zespol;
    const przeciwnik = (zespol === 'A') ? 'B' : 'A';
    
    aktywneStaty.blok.blad++;
    dodajBladWlasny(zespol);
    dodajPunkt(przeciwnik);
    
    const button = document.querySelector(`[data-shortcut="${shortcutId}"]`);
    wizualnePotwierdzenie(button);
    pokazPodsumowanie();
}


// ====================================================================
// FUNKCJE PODSUMOWANIA I RAPORTOWANIA
// ====================================================================

function pokazPodsumowanie() {
    if (!aktualnieWybranyZawodnik) {
        document.getElementById('podsumowanie-zawodnika').style.display = 'none';
        return;
    }
    
    // POBIERAMY STATYSTYKI TYLKO DLA AKTUALNEGO SETA
    const s = getAktywneStatystyki(); 

    if (!s) {
        document.getElementById('podsumowanie-zawodnika').style.display = 'none';
        return;
    }

    // Informacje o zawodniku
    document.getElementById('podsumowanie-imie-nr').textContent = 
        `${aktualnieWybranyZawodnik.nr} ${aktualnieWybranyZawodnik.imie} (Set ${aktualnySet})`;
    
    // --- OBLICZENIA I WSKAŹNIKI ---
    
    // Przyjęcie
    const sumPrzyc = s.przyjecia['1'] + s.przyjecia['2'] + s.przyjecia['3'] + s.przyjecia['4'];
    const pPerfect = sumPrzyc > 0 ? ((s.przyjecia['3'] + s.przyjecia['2']) / sumPrzyc) * 100 : 0;
    const pPositive = sumPrzyc > 0 ? ((s.przyjecia['1'] + s.przyjecia['2'] + s.przyjecia['3']) / sumPrzyc) * 100 : 0;

    // Atak
    const sumAtak = s.atak.wygrany + s.atak.kontynuowany + s.atak.blad;
    const pEfficiency = sumAtak > 0 ? (s.atak.wygrany / sumAtak) * 100 : 0;
    
    // Serwis
    const sumSerwis = s.serwis.as + s.serwis.kontynuowany + s.serwis.blad;
    const pSkutecznoscS = sumSerwis > 0 ? ((s.serwis.as + s.serwis.kontynuowany) / sumSerwis) * 100 : 0;

    // Punkty
    const punktyIndywidualne = s.atak.wygrany + s.serwis.as + s.blok.punktowy;
    
    // --- GENEROWANIE TABEL HTML ---
    
    let html = '';
    
    // Tabela 1: Podstawowe Statystyki Akcji
    html += `
        <table class="stat-table">
            <thead>
                <tr class="stat-category-header">
                    <th colspan="2">PRZYJĘCIE & OBRONA</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Przyjęcie Perfekcyjne (3)</td><td>${s.przyjecia['3']}</td></tr>
                <tr><td>Przyjęcie Dobre (2)</td><td>${s.przyjecia['2']}</td></tr>
                <tr><td>Przyjęcie Negatywne (1)</td><td>${s.przyjecia['1']}</td></tr>
                <tr><td>Błąd Przyjęcia (4)</td><td>${s.przyjecia['4']}</td></tr>
                <tr class="stat-percentage" style="background-color: ${pPerfect > 50 ? '#d4edda' : '#f8d7da'}; color: #155724;">
                    <td>% Perfekcyjne</td><td>${pPerfect.toFixed(1)}%</td>
                </tr>
                <tr class="stat-percentage" style="background-color: ${pPositive > 70 ? '#cce5ff' : '#fff3cd'}; color: #004085;">
                    <td>% Pozytywne</td><td>${pPositive.toFixed(1)}%</td>
                </tr>
                <tr><td>Obrony Wykonane</td><td>${s.obrony}</td></tr>
            </tbody>
        </table>
    `;
    
    // Tabela 2: Statystyki Ataku
    html += `
        <table class="stat-table">
            <thead>
                <tr class="stat-category-header" style="background-color: #28a745;">
                    <th colspan="2">ATAK</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Atak Wygrany</td><td>${s.atak.wygrany}</td></tr>
                <tr><td>Atak Kontynuowany</td><td>${s.atak.kontynuowany}</td></tr>
                <tr><td>Błąd w Ataku</td><td>${s.atak.blad}</td></tr>
                <tr><td>Suma Ataków</td><td>${sumAtak}</td></tr>
                <tr class="stat-percentage" style="background-color: ${pEfficiency > 40 ? '#d4edda' : '#f8d7da'}; color: #155724;">
                    <td>% Skuteczności</td><td>${pEfficiency.toFixed(1)}%</td>
                </tr>
            </tbody>
        </table>
    `;

    // Tabela 3: Statystyki Serwisu i Bloku
    html += `
        <table class="stat-table">
            <thead>
                <tr class="stat-category-header" style="background-color: #6f42c1;">
                    <th colspan="2">SERWIS & BLOK</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Asy Serwisowe</td><td>${s.serwis.as}</td></tr>
                <tr><td>Serwis Kontynuowany</td><td>${s.serwis.kontynuowany}</td></tr>
                <tr><td>Błąd Serwisowy</td><td>${s.serwis.blad}</td></tr>
                <tr><td>Suma Serwisów</td><td>${sumSerwis}</td></tr>
                <tr class="stat-percentage" style="background-color: ${pSkutecznoscS > 70 ? '#cce5ff' : '#fff3cd'}; color: #004085;">
                    <td>% Skuteczności S.</td><td>${pSkutecznoscS.toFixed(1)}%</td>
                </tr>
                <tr><td>Blok Punktowy</td><td>${s.blok.punktowy}</td></tr>
                <tr><td>Blok Dotknięty</td><td>${s.blok.dotkniecie}</td></tr>
                <tr><td>Błąd Bloku</td><td>${s.blok.blad}</td></tr>
            </tbody>
        </table>
    `;

    // Tabela 4: Podsumowanie Punktowe i Błędy
    html += `
        <table class="stat-table">
            <thead>
                <tr class="stat-category-header" style="background-color: #dc3545;">
                    <th colspan="2">PODSUMOWANIE I BŁĘDY</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Punkty Indywidualne</td><td>${punktyIndywidualne}</td></tr>
                <tr><td>Wszystkie Błędy</td><td>${s.przyjecia['4'] + s.atak.blad + s.serwis.blad + s.blok.blad}</td></tr>
                <tr><td>Błąd w Ataku</td><td>${s.atak.blad}</td></tr>
                <tr><td>Błąd Serwisowy</td><td>${s.serwis.blad}</td></tr>
                <tr><td>Błąd Przyjęcia</td><td>${s.przyjecia['4']}</td></tr>
                <tr><td>Błąd Bloku</td><td>${s.blok.blad}</td></tr>
            </tbody>
        </table>
    `;

    document.getElementById('szczegoly-zawodnika').innerHTML = html;
    document.getElementById('podsumowanie-zawodnika').style.display = 'block';
}


// ====================================================================
// OBSŁUGA SKRÓTÓW KLAWISZOWYCH
// ====================================================================

document.addEventListener('keydown', (event) => {
    // Skróty dla zawodników Zespołu A (1-9)
    if (event.key >= '1' && event.key <= '9' && !event.shiftKey) {
        const nrSkroty = event.key;
        const button = document.querySelector(`#zawodnicyA button[data-shortcut="${nrSkroty}"]`);
        if (button) {
            button.click();
            event.preventDefault(); 
            return;
        }
    }
    
    // Skróty dla akcji (Shift + Litera)
    if (event.shiftKey) {
        const skrot = event.key.toUpperCase();
        const button = document.querySelector(`#panel-akcji button[data-shortcut="${skrot}"]`);
        
        if (button) {
            // Symuluj kliknięcie na przycisku akcji
            button.click();
            event.preventDefault(); 
        }
    }
});
