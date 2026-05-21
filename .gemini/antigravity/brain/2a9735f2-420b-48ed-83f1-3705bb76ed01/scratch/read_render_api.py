import urllib.request
import json

try:
    url = "https://mahamaya-enterprise.onrender.com/api/products"
    print(f"Fetching from {url}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        
    products = data.get('products', [])
    print(f"Loaded {len(products)} products.")
    if products:
        print("First product keys:", list(products[0].keys()))
        print("First product sample:")
        print(json.dumps(products[0], indent=2))
        
        print("\nAll products images info:")
        for p in products:
            print(f"ID: {p.get('id')}, Name: {p.get('name')}")
            print(f"  image: {p.get('image')}")
            print(f"  images: {p.get('images')}")
except Exception as e:
    print("Error:", e)
