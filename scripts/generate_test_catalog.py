import csv, os

fieldnames = ['label','asin','status','mustHave','priority','audience','ageMin','ageMax','tags','countryCodes','imageUrl']

new_products = [
    # ── FROID / HIVER ─────────────────────────────────────────────────────────
    {"label":"Doudoune femme prix 1","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"adult","ageMin":16,"ageMax":120,"tags":"doudoune,froid,hiver,femme,thermique,polaire","countryCodes":"","imageUrl":""},
    {"label":"Doudoune femme prix 2","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"adult","ageMin":16,"ageMax":120,"tags":"doudoune,froid,hiver,femme,thermique,polaire","countryCodes":"","imageUrl":""},
    {"label":"Doudoune enfant","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"child","ageMin":0,"ageMax":15,"tags":"doudoune,froid,hiver,enfant,thermique","countryCodes":"","imageUrl":""},
    {"label":"Sous-vêtements thermiques femme","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"adult","ageMin":16,"ageMax":120,"tags":"thermique,froid,hiver,femme,sous-vetements,neige","countryCodes":"","imageUrl":""},
    {"label":"Sous-vêtements thermiques enfant","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"child","ageMin":4,"ageMax":15,"tags":"thermique,froid,hiver,enfant,sous-vetements,neige","countryCodes":"","imageUrl":""},
    {"label":"Bonnet laine mixte","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"bonnet,froid,hiver,laine,neige,accessoires-hiver","countryCodes":"","imageUrl":""},
    {"label":"Gants hiver imperméables","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":4,"ageMax":120,"tags":"gants,froid,hiver,neige,impermeable,ski","countryCodes":"","imageUrl":""},
    {"label":"Gants ski enfant","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"child","ageMin":4,"ageMax":14,"tags":"gants,ski,froid,hiver,neige,enfant","countryCodes":"","imageUrl":""},
    {"label":"Écharpe polaire mixte","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":0,"ageMax":120,"tags":"echarpe,froid,hiver,polaire,neige","countryCodes":"","imageUrl":""},
    {"label":"Chaussettes thermiques laine","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"chaussettes,thermique,froid,hiver,laine,neige","countryCodes":"","imageUrl":""},
    {"label":"Bottes hiver imperméables homme","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"adult","ageMin":16,"ageMax":120,"tags":"bottes,froid,hiver,neige,impermeable,homme,chaussures-hiver","countryCodes":"","imageUrl":""},
    {"label":"Bottes hiver imperméables femme","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"adult","ageMin":16,"ageMax":120,"tags":"bottes,froid,hiver,neige,impermeable,femme,chaussures-hiver","countryCodes":"","imageUrl":""},
    {"label":"Bottes hiver enfant","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"child","ageMin":0,"ageMax":15,"tags":"bottes,froid,hiver,neige,enfant,chaussures-hiver","countryCodes":"","imageUrl":""},
    {"label":"Pantalon de ski homme","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"adult","ageMin":16,"ageMax":120,"tags":"ski,pantalon,froid,hiver,neige,homme,glisse","countryCodes":"","imageUrl":""},
    {"label":"Pantalon de ski femme","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"adult","ageMin":16,"ageMax":120,"tags":"ski,pantalon,froid,hiver,neige,femme,glisse","countryCodes":"","imageUrl":""},
    {"label":"Cagoule / tour de cou","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":4,"ageMax":120,"tags":"cagoule,froid,hiver,neige,protection-visage","countryCodes":"","imageUrl":""},
    {"label":"Crampons chaussures glace","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"adult","ageMin":16,"ageMax":120,"tags":"crampons,glace,froid,hiver,neige,securite,randonnee-hiver","countryCodes":"","imageUrl":""},
    {"label":"Chaufferettes mains","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":0,"ageMax":120,"tags":"chaufferettes,froid,hiver,neige,confort-hiver","countryCodes":"","imageUrl":""},

    # ── CHALEUR / ÉTÉ / TROPICAL ───────────────────────────────────────────────
    {"label":"Crème solaire SPF50 visage","asin":"test","status":"active","mustHave":"true","priority":1,"audience":"all","ageMin":0,"ageMax":120,"tags":"soleil,chaleur,ete,protection-solaire,creme-solaire,tropical,plage","countryCodes":"","imageUrl":""},
    {"label":"Crème solaire SPF50 corps","asin":"test","status":"active","mustHave":"true","priority":1,"audience":"all","ageMin":0,"ageMax":120,"tags":"soleil,chaleur,ete,protection-solaire,creme-solaire,tropical,plage","countryCodes":"","imageUrl":""},
    {"label":"Crème solaire enfant SPF50+","asin":"test","status":"active","mustHave":"true","priority":1,"audience":"child","ageMin":0,"ageMax":15,"tags":"soleil,chaleur,ete,protection-solaire,creme-solaire,enfant","countryCodes":"","imageUrl":""},
    {"label":"Chapeau anti-UV mixte","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"chapeau,soleil,chaleur,ete,protection-solaire,bob","countryCodes":"","imageUrl":""},
    {"label":"Short de bain homme","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"adult","ageMin":16,"ageMax":120,"tags":"plage,mer,baignade,chaleur,ete,maillot,homme","countryCodes":"","imageUrl":""},
    {"label":"Maillot de bain femme","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"adult","ageMin":16,"ageMax":120,"tags":"plage,mer,baignade,chaleur,ete,maillot,femme","countryCodes":"","imageUrl":""},
    {"label":"Maillot de bain enfant","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"child","ageMin":0,"ageMax":15,"tags":"plage,mer,baignade,chaleur,ete,maillot,enfant","countryCodes":"","imageUrl":""},
    {"label":"Robe légère femme","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"adult","ageMin":16,"ageMax":120,"tags":"robe,chaleur,ete,leger,femme,tropical","countryCodes":"","imageUrl":""},
    {"label":"Short cargo homme","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"adult","ageMin":16,"ageMax":120,"tags":"short,chaleur,ete,leger,homme,randonnee","countryCodes":"","imageUrl":""},
    {"label":"T-shirts respirants femme","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"adult","ageMin":16,"ageMax":120,"tags":"shirts,respirant,chaleur,ete,femme,leger","countryCodes":"","imageUrl":""},
    {"label":"Sandales légères homme","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"adult","ageMin":16,"ageMax":120,"tags":"sandales,chaleur,ete,plage,leger,homme","countryCodes":"","imageUrl":""},
    {"label":"Sandales légères femme","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"adult","ageMin":16,"ageMax":120,"tags":"sandales,chaleur,ete,plage,leger,femme","countryCodes":"","imageUrl":""},
    {"label":"Anti-moustique spray","asin":"test","status":"active","mustHave":"true","priority":1,"audience":"all","ageMin":0,"ageMax":120,"tags":"anti-moustique,tropical,chaleur,sante,protection,insectes","countryCodes":"TH,MA,BR","imageUrl":""},
    {"label":"Anti-moustique bracelet enfant","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"child","ageMin":0,"ageMax":15,"tags":"anti-moustique,tropical,enfant,sante,protection,insectes","countryCodes":"TH,MA,BR","imageUrl":""},
    {"label":"Ventilateur portable USB","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":0,"ageMax":120,"tags":"chaleur,ete,confort,ventilateur,tropical","countryCodes":"","imageUrl":""},

    # ── PLAGE / MER ────────────────────────────────────────────────────────────
    {"label":"Masque de snorkeling","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":6,"ageMax":120,"tags":"snorkeling,plage,mer,natation,plongee,tropical","countryCodes":"","imageUrl":""},
    {"label":"Palmes légères","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"adult","ageMin":16,"ageMax":120,"tags":"palmes,plage,mer,natation,plongee,snorkeling","countryCodes":"","imageUrl":""},
    {"label":"Sac étanche waterproof","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"etanche,waterproof,plage,mer,kayak,protection","countryCodes":"","imageUrl":""},
    {"label":"Tapis de plage sable resistant","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":0,"ageMax":120,"tags":"plage,mer,sable,confort,ete","countryCodes":"","imageUrl":""},

    # ── RANDONNÉE / TREK ───────────────────────────────────────────────────────
    {"label":"Sac à dos randonnée 40L","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"adult","ageMin":16,"ageMax":120,"tags":"randonnee,trek,sac-a-dos,montagne,outdoor,backpacking","countryCodes":"","imageUrl":""},
    {"label":"Sac à dos randonnée 20L","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":8,"ageMax":120,"tags":"randonnee,trek,sac-a-dos,montagne,outdoor,journee","countryCodes":"","imageUrl":""},
    {"label":"Bâtons de randonnée","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"adult","ageMin":16,"ageMax":120,"tags":"randonnee,trek,montagne,batons,outdoor","countryCodes":"","imageUrl":""},
    {"label":"Chaussures de randonnée homme","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"adult","ageMin":16,"ageMax":120,"tags":"randonnee,trek,chaussures,montagne,outdoor,homme","countryCodes":"","imageUrl":""},
    {"label":"Chaussures de randonnée enfant","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"child","ageMin":4,"ageMax":15,"tags":"randonnee,trek,chaussures,montagne,outdoor,enfant","countryCodes":"","imageUrl":""},
    {"label":"Guêtres imperméables","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"adult","ageMin":16,"ageMax":120,"tags":"randonnee,trek,impermeable,montagne,outdoor,boue","countryCodes":"","imageUrl":""},
    {"label":"Poncho de pluie léger","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"pluie,impermeable,randonnee,outdoor,leger","countryCodes":"","imageUrl":""},
    {"label":"Veste imperméable homme","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"adult","ageMin":16,"ageMax":120,"tags":"pluie,impermeable,randonnee,outdoor,veste,homme","countryCodes":"","imageUrl":""},
    {"label":"Veste imperméable femme","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"adult","ageMin":16,"ageMax":120,"tags":"pluie,impermeable,randonnee,outdoor,veste,femme","countryCodes":"","imageUrl":""},
    {"label":"Pantalon de randonnée convertible homme","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"adult","ageMin":16,"ageMax":120,"tags":"randonnee,trek,pantalon,outdoor,homme,convertible","countryCodes":"","imageUrl":""},
    {"label":"Pantalon de randonnée femme","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"adult","ageMin":16,"ageMax":120,"tags":"randonnee,trek,pantalon,outdoor,femme","countryCodes":"","imageUrl":""},
    {"label":"Boussole de randonnée","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"adult","ageMin":16,"ageMax":120,"tags":"randonnee,trek,boussole,orientation,outdoor,montagne","countryCodes":"","imageUrl":""},
    {"label":"Couverture de survie","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"securite,randonnee,survie,urgence,outdoor,montagne","countryCodes":"","imageUrl":""},

    # ── ÉLECTRONIQUE / TECH ────────────────────────────────────────────────────
    {"label":"Adaptateur universel de voyage","asin":"test","status":"active","mustHave":"true","priority":1,"audience":"all","ageMin":0,"ageMax":120,"tags":"adaptateur,electronique,chargeur,universel,tech","countryCodes":"","imageUrl":""},
    {"label":"Power bank 20000mAh","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"all","ageMin":0,"ageMax":120,"tags":"powerbank,batterie,electronique,chargeur,tech","countryCodes":"","imageUrl":""},
    {"label":"Power bank solaire","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"powerbank,solaire,batterie,electronique,outdoor,randonnee","countryCodes":"","imageUrl":""},
    {"label":"Câble multi USB","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"cable,electronique,chargeur,tech,usb","countryCodes":"","imageUrl":""},
    {"label":"Casque audio voyage bruit","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":8,"ageMax":120,"tags":"casque,audio,confort,transport,avion,electronique","countryCodes":"","imageUrl":""},
    {"label":"Serrure TSA valise","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"cadenas,securite,valise,tsa,bagage","countryCodes":"US","imageUrl":""},
    {"label":"Cadenas valise combinaison","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"cadenas,securite,valise,bagage","countryCodes":"","imageUrl":""},
    {"label":"Appareil photo compact waterproof","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":8,"ageMax":120,"tags":"photo,waterproof,electronique,plage,randonnee,mer","countryCodes":"","imageUrl":""},
    {"label":"GoPro / caméra action","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"adult","ageMin":16,"ageMax":120,"tags":"gopro,photo,video,outdoor,randonnee,sport,waterproof","countryCodes":"","imageUrl":""},

    # ── BAGAGERIE / ORGANISATION ───────────────────────────────────────────────
    {"label":"Valise cabine rigide","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"valise,bagage,transport,cabine","countryCodes":"","imageUrl":""},
    {"label":"Sac de voyage pliable","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"sac-voyage,bagage,transport,pliable,leger","countryCodes":"","imageUrl":""},
    {"label":"Pochette anti-vol ceinture","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"adult","ageMin":16,"ageMax":120,"tags":"securite,anti-vol,pochette,documents,voyage","countryCodes":"","imageUrl":""},
    {"label":"Organiseur de câbles","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":0,"ageMax":120,"tags":"organisation,cables,electronique,rangement","countryCodes":"","imageUrl":""},
    {"label":"Cubes de rangement bagages set","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":0,"ageMax":120,"tags":"organisation,rangement,bagage,valise,cubes","countryCodes":"","imageUrl":""},
    {"label":"Porte-documents voyage","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"documents,organisation,securite,passeport,voyage","countryCodes":"","imageUrl":""},
    {"label":"Étiquettes bagage","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":0,"ageMax":120,"tags":"bagage,etiquette,organisation,valise","countryCodes":"","imageUrl":""},

    # ── SANTÉ / HYGIÈNE ────────────────────────────────────────────────────────
    {"label":"Kit hygiène voyage miniatures","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"hygiene,soin,toilette,miniatures,voyage","countryCodes":"","imageUrl":""},
    {"label":"Pastilles purification eau","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"eau,purification,sante,outdoor,randonnee,trek,tropical","countryCodes":"","imageUrl":""},
    {"label":"Crème anti-friction","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":0,"ageMax":120,"tags":"sante,soin,randonnee,confort,friction","countryCodes":"","imageUrl":""},
    {"label":"Médicaments mal des transports","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"sante,medicaments,transport,avion,bateau,confort","countryCodes":"","imageUrl":""},
    {"label":"Spray désinfectant mains","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"hygiene,sante,desinfectant,protection","countryCodes":"","imageUrl":""},
    {"label":"Collyre yeux secs voyage","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"adult","ageMin":16,"ageMax":120,"tags":"sante,soin,yeux,avion,confort","countryCodes":"","imageUrl":""},

    # ── CONFORT / TRANSPORT ────────────────────────────────────────────────────
    {"label":"Coussin de voyage gonflable","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":0,"ageMax":120,"tags":"confort,transport,avion,train,sommeil","countryCodes":"","imageUrl":""},
    {"label":"Masque de nuit sommeil","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":0,"ageMax":120,"tags":"confort,sommeil,transport,avion,nuit","countryCodes":"","imageUrl":""},
    {"label":"Bouchons oreilles réutilisables","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":0,"ageMax":120,"tags":"confort,sommeil,transport,avion,bruit","countryCodes":"","imageUrl":""},
    {"label":"Couverture polaire légère voyage","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":0,"ageMax":120,"tags":"confort,transport,avion,froid,sommeil,couverture","countryCodes":"","imageUrl":""},
    {"label":"Sac de couchage léger","asin":"test","status":"active","mustHave":"false","priority":2,"audience":"all","ageMin":0,"ageMax":120,"tags":"camping,randonnee,trek,sommeil,outdoor,backpacking","countryCodes":"","imageUrl":""},

    # ── SPORT SPÉCIFIQUE ──────────────────────────────────────────────────────
    {"label":"Tapis de yoga voyage pliable","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"adult","ageMin":16,"ageMax":120,"tags":"yoga,sport,bien-etre,meditation,confort","countryCodes":"","imageUrl":""},
    {"label":"Corde à sauter sport","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":6,"ageMax":120,"tags":"sport,fitness,training,cardio,leger","countryCodes":"","imageUrl":""},
    {"label":"Raquette de plage","asin":"test","status":"active","mustHave":"false","priority":3,"audience":"all","ageMin":6,"ageMax":120,"tags":"plage,sport,jeux,ete,mer","countryCodes":"","imageUrl":""},
    {"label":"Masque de ski / snowboard","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"all","ageMin":6,"ageMax":120,"tags":"ski,snowboard,hiver,neige,glisse,montagne","countryCodes":"","imageUrl":""},
    {"label":"Casque de ski adulte","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"adult","ageMin":16,"ageMax":120,"tags":"ski,snowboard,hiver,neige,glisse,securite,casque","countryCodes":"","imageUrl":""},
    {"label":"Casque de ski enfant","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"child","ageMin":4,"ageMax":15,"tags":"ski,snowboard,hiver,neige,glisse,securite,casque,enfant","countryCodes":"","imageUrl":""},
    {"label":"Gilet de sauvetage kayak","asin":"test","status":"active","mustHave":"false","priority":1,"audience":"all","ageMin":0,"ageMax":120,"tags":"kayak,canoe,mer,riviere,securite,sport-eau","countryCodes":"","imageUrl":""},
]

# Lire existants
path = os.path.join(os.path.dirname(__file__), '..', 'data', 'sheet-export-clean.csv')
with open(path, 'r', encoding='utf-8') as f:
    existing = list(csv.DictReader(f))

# Dédupe sur label
existing_labels = {r['label'].lower() for r in existing}
added = 0
for p in new_products:
    if p['label'].lower() not in existing_labels:
        existing.append(p)
        added += 1

with open(path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(existing)

print(f'{added} produits ajoutés. Total : {len(existing)}')
