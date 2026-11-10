import os
import json

# Configuration
DATA_DIR = '../data'  # Path to data directory relative to this script
OUTPUT_FILE = '../js/quran-data.js' # Path to output file relative to this script

def main():
    print(f"Building data from {DATA_DIR} to {OUTPUT_FILE}...")
    
    quran_data = {
        'surahs': [],
        'translations': {}
    }

    # 1. Load Surah Data (1.json to 114.json)
    print("Loading Surah data...")
    for i in range(1, 115):
        filename = f"{i}.json"
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8-sig') as f:
                data = json.load(f)
                # We can optimize here if needed, but for now just load everything
                quran_data['surahs'].append(data)
        else:
            print(f"Warning: {filename} not found!")

    # 2. Load Translations
    print("Loading Translations...")
    
    # Custom Full Quran (Kampung Sunnah)
    custom_path = os.path.join(DATA_DIR, 'custom_full_quran.json')
    if os.path.exists(custom_path):
        with open(custom_path, 'r', encoding='utf-8-sig') as f:
            quran_data['translations']['kemenag_lama'] = json.load(f)
            print("Loaded custom_full_quran.json")
    
    # Kemenag 2002
    kemenag2002_path = os.path.join(DATA_DIR, 'kemenag2002.json')
    if os.path.exists(kemenag2002_path):
        with open(kemenag2002_path, 'r', encoding='utf-8-sig') as f:
            quran_data['translations']['kemenag_2002'] = json.load(f)
            print("Loaded kemenag2002.json")

    # 3. Write to JS File
    print("Writing to JS file...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("window.QURAN_DATA = ")
        json.dump(quran_data, f, ensure_ascii=False)
        f.write(";")
    
    print(f"Done! Created {OUTPUT_FILE}")

if __name__ == '__main__':
    # Change working directory to script location to ensure relative paths work
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    main()
