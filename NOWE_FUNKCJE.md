# Nowe funkcje w aplikacji Mapa

## Przesyłanie obrazów z komputera

### Co się zmieniło:
- Pole "Obraz" teraz obsługuje przesyłanie plików bezpośrednio z komputera
- Nadal można wprowadzić URL obrazu jak wcześniej
- Przesłane pliki są zapisywane w folderze `static/uploads/`

### Jak używać:
1. W schemacie dodaj pole typu "Obraz"
2. Podczas dodawania pinezki:
   - **Opcja A**: Wprowadź URL obrazu w pole tekstowe
   - **Opcja B**: Kliknij "📁 Prześlij plik" i wybierz obraz z komputera
3. Podgląd obrazu pojawi się automatycznie

### Ograniczenia:
- Maksymalny rozmiar pliku: 5MB
- Obsługiwane formaty: wszystkie popularne formaty obrazów (JPG, PNG, GIF, WebP, itp.)

---

## Import i eksport pinezek z Excel

### Import z Excel:
1. **Pobierz szablon**: Kliknij "📋 Pobierz szablon Excel" aby otrzymać plik dostosowany do twojego schematu
2. **Wypełnij szablon**: Wklej swoje dane do pobranego szablonu (instrukcje są w pliku)
3. **Importuj**: Kliknij "📥 Importuj z Excel" i wybierz wypełniony plik
4. Aplikacja automatycznie:
   - Analizuje dane (z paskiem postępu)
   - Znajduje współrzędne dla adresów polskich
   - Pokazuje podgląd z oznaczeniem niekompletnych danych
5. **Wybierz i importuj**: Zaznacz wiersze do importu i kliknij "Importuj wybrane"

### Funkcje importu:
- **Szablon Excel**: Automatycznie generowany na podstawie aktualnego schematu
- **Loading z anulowaniem**: Możliwość przerwania długotrwałego importu
- **Inteligentne mapowanie**: Rozpoznaje polskie i angielskie nazwy kolumn
- **Ostrzeżenia**: Wyraźne oznaczenie pinezek z niekompletnymi danymi

### Rozpoznawanie kolumn:
- **Adresy**: kolumny zawierające "adres", "address", "lokalizacja", "location", "miejsce"
- **Szerokość geograficzna**: kolumny zawierające "lat", "latitude", "szerokość", "szerokosc"
- **Długość geograficzna**: kolumny zawierające "lng", "lon", "longitude", "długość", "dlugosc"

### Eksport do Excel:
1. Gdy masz pinezki w aplikacji, kliknij "📤 Eksportuj do Excel"
2. Plik zostanie automatycznie pobrany
3. Zawiera wszystkie dane pinezek oraz współrzędne

---

## Pole Adres z automatyczną synchronizacją

### Jak dodać pole adresu:
1. W konstruktorze schematu wybierz typ pola "Adres"
2. Zaznacz opcję "Automatyczna synchronizacja z współrzędnymi" (opcjonalne)
3. Zapisz pole

### Jak działa synchronizacja:
- **Adres → Współrzędne**: Wpisz adres i kliknij "🔍 Znajdź na mapie" - aplikacja automatycznie znajdzie lokalizację
- **Współrzędne → Adres**: Kliknij na mapę - aplikacja automatycznie wypełni adres (tylko gdy synchronizacja jest włączona)

### Funkcje:
- Obsługa polskich znaków (ą, ć, ę, ł, ń, ó, ś, ź, ż)
- Formatowanie adresów (rozwijanie skrótów: ul. → ulica, al. → aleja)
- Używa bezpłatnego serwisu OpenStreetMap Nominatim
- Możliwość wyłączenia synchronizacji dla każdego pola osobno

### Wskazówki:
- Wpisuj adresy w formacie: "ulica numer, miasto"
- Przykłady: "ul. Marszałkowska 1, Warszawa", "Plac Zamkowy 4, Kraków"
- Jeśli adres nie zostanie znaleziony, spróbuj uproscić (usuń numer mieszkania, kod pocztowy itp.)

## Oznaczenia pinezek z niekompletnymi danymi

### Wizualne wskaźniki:
- **⚠️ Pomarańczowe tło** na liście pinezek
- **⚠️ Badge** w nagłówku pinezki
- **Tooltip** z wyjaśnieniem przy najechaniu
- **Ostrzeżenie** podczas importu z informacją o liczbie niekompletnych pinezek

### Kiedy pinezka jest oznaczona jako niekompletna:
- **Pola wymagane są puste** po imporcie z Excel
- **Pola typu "tags"** nie mogą być zaimportowane z Excel
- **Brak danych** w wymaganych polach numerycznych/tekstowych

### Jak uzupełnić niekompletne pinezki:
1. Znajdź pinezki z ⚠️ na liście
2. Kliknij "Edytuj" 
3. Uzupełnij brakujące dane
4. Zapisz - oznaczenie ⚠️ zniknie automatycznie

---

## Techniczne szczegóły

### Nowe typy pól:
- `address` - Pole adresu z opcjonalną synchronizacją z współrzędnymi

### Nowe API endpointy:
- `POST /api/upload` - Przesyłanie obrazów  
- `POST /api/excel-template` - Generowanie szablonu Excel
- `POST /api/import-excel` - Import danych z Excel (ulepszona wersja)
- `POST /api/export-excel` - Eksport danych do Excel  
- `POST /api/geocode` - Konwersja adresu na współrzędne
- `POST /api/reverse-geocode` - Konwersja współrzędnych na adres

### Dodane biblioteki:
- `xlsx` - Obsługa plików Excel
- `multer` - Przesyłanie plików

### Nowe funkcje bazy danych:
- Flaga `hasIncompleteData` dla obiektów
- Rozszerzona funkcja `createObject()` z obsługą niekompletnych danych
- Ulepszone funkcje `getObjects()` do ładowania flag niekompletności

### Konfiguracja serwera:
- Folder `static/uploads/` musi być dostępny dla zapisu
- Endpointy geocoding używają zewnętrznego API (OpenStreetMap Nominatim)  
- Wymaga połączenia z internetem dla funkcji geokodowania
- Obsługa anulowania długotrwałych operacji importu