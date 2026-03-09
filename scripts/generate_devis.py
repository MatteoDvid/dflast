from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame
from reportlab.pdfgen import canvas as pdfcanvas
import os

OUTPUT = os.path.join(os.path.dirname(__file__), "..", "devis-dont-forget-2026.pdf")

# ── Couleurs ───────────────────────────────────────────────────────────────────
GREEN       = colors.HexColor("#099142")
DARK        = colors.HexColor("#1a1a1a")
GRAY        = colors.HexColor("#666666")
LIGHT_GRAY  = colors.HexColor("#f5f5f5")
LIGHT_GREEN = colors.HexColor("#e8f5e9")
WHITE       = colors.white
BORDER_GRAY = colors.HexColor("#e0e0e0")

W, H = A4

# ── Header / Footer ────────────────────────────────────────────────────────────
def draw_header(c, doc):
    c.saveState()
    # Bande verte en haut
    c.setFillColor(GREEN)
    c.rect(0, H - 22*mm, W, 22*mm, fill=1, stroke=0)
    # Titre blanc
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(20*mm, H - 13*mm, "DON'T FORGET")
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#a8e6bf"))
    c.drawString(20*mm, H - 18*mm, "par tsuno")
    c.setFillColor(WHITE)
    c.setFont("Helvetica", 9)
    c.drawRightString(W - 20*mm, H - 10*mm, "app.dont-forget.co")
    c.drawRightString(W - 20*mm, H - 15*mm, "Ref : DF-2026-001")
    c.restoreState()

def draw_footer(c, doc):
    c.saveState()
    c.setStrokeColor(BORDER_GRAY)
    c.setLineWidth(0.5)
    c.line(20*mm, 14*mm, W - 20*mm, 14*mm)
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 7.5)
    c.drawString(20*mm, 10*mm, "tsuno pour Don't Forget  -  Devis non contractuel, valable 30 jours. Prix en euros HT.")
    c.drawRightString(W - 20*mm, 10*mm, f"Page {doc.page}")
    c.restoreState()

def on_page(c, doc):
    draw_header(c, doc)
    draw_footer(c, doc)

# ── Styles ─────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

def S(name, **kw):
    return ParagraphStyle(name, **kw)

sTitle = S("sTitle", fontSize=22, fontName="Helvetica-Bold", textColor=DARK,
           spaceAfter=2*mm, leading=26)
sSubtitle = S("sSubtitle", fontSize=10, fontName="Helvetica", textColor=GRAY,
              spaceAfter=8*mm)
sSection = S("sSection", fontSize=12, fontName="Helvetica-Bold", textColor=GREEN,
             spaceBefore=5*mm, spaceAfter=2*mm, leading=16)
sSectionDark = S("sSectionDark", fontSize=12, fontName="Helvetica-Bold", textColor=DARK,
                 spaceBefore=5*mm, spaceAfter=2*mm, leading=16)
sBody = S("sBody", fontSize=9, fontName="Helvetica", textColor=DARK,
          spaceAfter=2*mm, leading=13)
sBodyGray = S("sBodyGray", fontSize=8.5, fontName="Helvetica", textColor=GRAY,
              spaceAfter=1*mm, leading=12)
sBold = S("sBold", fontSize=9, fontName="Helvetica-Bold", textColor=DARK, leading=13)
sNote = S("sNote", fontSize=8, fontName="Helvetica-Oblique", textColor=GRAY,
          spaceAfter=2*mm, leading=11)
sTotal = S("sTotal", fontSize=13, fontName="Helvetica-Bold", textColor=WHITE, leading=18)
sTotalSub = S("sTotalSub", fontSize=9, fontName="Helvetica", textColor=WHITE, leading=13)
sRight = S("sRight", fontSize=9, fontName="Helvetica-Bold", textColor=DARK,
           alignment=TA_RIGHT)
sCenter = S("sCenter", fontSize=9, fontName="Helvetica", textColor=GRAY, alignment=TA_CENTER)
sTag = S("sTag", fontSize=7.5, fontName="Helvetica-Bold", textColor=GREEN)
sCond = S("sCond", fontSize=8.5, fontName="Helvetica", textColor=DARK,
          spaceAfter=1.5*mm, leading=12)

# ── Table helper ───────────────────────────────────────────────────────────────
COL_ITEM  = 8.5*mm
COL_DESC  = 90*mm
COL_PRICE = 30*mm
FULL_W    = W - 40*mm  # marges 20mm de chaque côté

def section_table(rows, col_widths=None, header=True):
    """rows : list of [col1, col2, col3] — col1 peut être Paragraph"""
    if col_widths is None:
        col_widths = [COL_ITEM, COL_DESC, COL_PRICE]

    style = [
        ("BACKGROUND",  (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR",   (0, 0), (-1, 0), WHITE),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, 0), 8.5),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 5),
        ("TOPPADDING",    (0, 0), (-1, 0), 5),
        ("ALIGN",       (2, 0), (2, -1), "RIGHT"),
        ("FONTSIZE",    (0, 1), (-1, -1), 8.5),
        ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
        ("TEXTCOLOR",   (0, 1), (-1, -1), DARK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        ("TOPPADDING",    (0, 1), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 5),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 5),
        ("GRID",        (0, 0), (-1, -1), 0.25, BORDER_GRAY),
        ("VALIGN",      (0, 0), (-1, -1), "TOP"),
    ]
    return Table(rows, colWidths=col_widths, style=TableStyle(style), hAlign="LEFT")

def total_table(label, ht, ttc=None):
    data = [[Paragraph(label, sTotal),
             Paragraph(f"{ht}", sTotal)]]
    if ttc:
        data.append([Paragraph("TVA 20 % incluse", sTotalSub),
                     Paragraph(f"({ttc} TTC)", sTotalSub)])
    t = Table(data, colWidths=[120*mm, 40*mm],
              style=TableStyle([
                  ("BACKGROUND",    (0, 0), (-1, -1), GREEN),
                  ("ALIGN",         (1, 0), (1, -1), "RIGHT"),
                  ("LEFTPADDING",   (0, 0), (-1, -1), 6),
                  ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
                  ("TOPPADDING",    (0, 0), (-1, -1), 6),
                  ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                  ("ROUNDEDCORNERS", [4]),
              ]), hAlign="RIGHT")
    return t

# ── Contenu ────────────────────────────────────────────────────────────────────
def build():
    doc = BaseDocTemplate(
        OUTPUT, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=28*mm, bottomMargin=22*mm,
    )
    frame = Frame(20*mm, 22*mm, W - 40*mm, H - 50*mm, id="main")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=on_page)])

    story = []

    # ── En-tête du document ────────────────────────────────────────────────────
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("DEVIS", sTitle))
    story.append(Paragraph(
        "Application web Don't Forget &nbsp;·&nbsp; Émis le 08/03/2026 &nbsp;·&nbsp; Validité 30 jours",
        sSubtitle))
    story.append(HRFlowable(width="100%", thickness=1, color=GREEN, spaceAfter=4*mm))

    # ── Bloc client / émetteur ─────────────────────────────────────────────────
    info_data = [
        [Paragraph("<b>EMETTEUR</b>", sBold), Paragraph("<b>CLIENT</b>", sBold)],
        [Paragraph("tsuno — Matteo David", sBody),    Paragraph("Ethan & equipe Don't Forget", sBody)],
        [Paragraph("david.matteo.pro@gmail.com", sBodyGray), Paragraph("app.dont-forget.co", sBodyGray)],
    ]
    info_t = Table(info_data, colWidths=[80*mm, 80*mm],
                   style=TableStyle([
                       ("BACKGROUND",  (0, 0), (-1, 0), LIGHT_GRAY),
                       ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
                       ("FONTSIZE",    (0, 0), (-1, -1), 8.5),
                       ("LEFTPADDING", (0, 0), (-1, -1), 5),
                       ("TOPPADDING",  (0, 0), (-1, -1), 4),
                       ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                       ("GRID",        (0, 0), (-1, -1), 0.25, BORDER_GRAY),
                   ]), hAlign="LEFT")
    story.append(info_t)
    story.append(Spacer(1, 6*mm))

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 0 — Déjà livré
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("0 — Déjà livré (V0 — inclus dans le projet en cours)", sSectionDark))
    story.append(Paragraph(
        "Ces éléments sont déjà développés et en production sur app.dont-forget.co.",
        sNote))

    v0_rows = [
        ["#", Paragraph("Élément livré", sBold), Paragraph("Détail", sBold)],
        ["1", Paragraph("Application web complète", sBold),
               Paragraph("Next.js 14, TypeScript strict, TailwindCSS — déployée sur Vercel avec domaine custom", sBody)],
        ["2", Paragraph("Wizard de saisie 5 étapes", sBold),
               Paragraph("Destination (géocodage live OpenStreetMap), dates, voyageurs, activités (108 prédéfinies), budget", sBody)],
        ["3", Paragraph("Moteur de recommandation IA", sBold),
               Paragraph("Analyse du voyage par GPT-4o-mini, sélection intelligente de tags produits avec logique de priorité", sBody)],
        ["4", Paragraph("Catalogue produits dynamique", sBold),
               Paragraph("Géré via Google Sheets, cache 3 niveaux (mémoire → disque → API) pour performance optimale", sBody)],
        ["5", Paragraph("Système d'affiliation Amazon", sBold),
               Paragraph("Redirection affiliée (dontforget-21) sur tous les produits recommandés", sBody)],
        ["6", Paragraph("Export PDF checklist", sBold),
               Paragraph("PDF téléchargeable A4 avec récapitulatif voyage, cases à cocher, et liens Amazon cliquables", sBody)],
        ["7", Paragraph("Design responsive", sBold),
               Paragraph("Interfaces optimisées mobile, tablette et desktop", sBody)],
    ]
    story.append(section_table(v0_rows, col_widths=[8*mm, 55*mm, 107*mm]))
    story.append(Spacer(1, 6*mm))

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 1 — V1
    # ══════════════════════════════════════════════════════════════════════════
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_GRAY, spaceAfter=3*mm))
    story.append(Paragraph("1 — V1 · Lancement officiel", sSection))
    story.append(Paragraph(
        "Prestations nécessaires pour lancer la communication et les publicités.",
        sNote))

    v1_rows = [
        ["#", Paragraph("Prestation", sBold), Paragraph("Prix HT", sBold)],
        ["1.1",
         Paragraph("<b>Redesign visuel de la liste resultats</b><br/>"
                   "<font color='#666666' size='8'>Organisation par categories (Vetements, Securite, Electronique, Sante...), "
                   "cartes produits premium, badges Essentiel / Recommande IA. "
                   "Section dediee Indispensables pour tout voyage (passeport, piece d'identite, "
                   "telephone, chargeur universel...) affichee au-dessus des produits affilies.</font>", sBody),
         Paragraph("1 300 €", sRight)],
        ["1.2",
         Paragraph("<b>Images automatiques pour chaque produit</b><br/>"
                   "<font color='#666666' size='8'>Integration des images Amazon via ASIN (aucun cout API supplementaire), "
                   "lazy loading optimise, fallback propre par categorie si image indisponible. "
                   "Tests cross-device et optimisation mobile inclus.</font>", sBody),
         Paragraph("700 €", sRight)],
    ]
    story.append(section_table(v1_rows, col_widths=[9*mm, 130*mm, 31*mm]))
    story.append(Spacer(1, 3*mm))
    story.append(total_table("TOTAL V1 — Lancement officiel", "2 000 € HT", "2 400 € TTC"))
    story.append(Paragraph("Délai estimé : 2 à 3 semaines après validation et acompte.", sNote))
    story.append(Spacer(1, 6*mm))

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 2 — V2 Évolutions
    # ══════════════════════════════════════════════════════════════════════════
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_GRAY, spaceAfter=3*mm))
    story.append(Paragraph("2 — V2 · Évolutions & options (sur devis séparé)", sSection))
    story.append(Paragraph(
        "Options à valider indépendamment — chaque ligne est une prestation autonome.",
        sNote))

    v2_rows = [
        ["#", Paragraph("Option", sBold), Paragraph("Estimation HT", sBold)],
        ["2.1",
         Paragraph("<b>Banniere IA decorative destination</b><br/>"
                   "<font color='#666666' size='8'>Image generee par IA en en-tete de la page resultats selon la destination choisie — "
                   "renforce l'experience immersive et le sentiment de personnalisation.</font>", sBody),
         Paragraph("400 €", sRight)],
        ["2.2",
         Paragraph("<b>Recommandations d'activités</b><br/>"
                   "<font color='#666666' size='8'>L'IA suggère des activités à faire sur place selon la destination, "
                   "avec liens partenaires ou affiliés.</font>", sBody),
         Paragraph("2 000 – 3 000 €", sRight)],
        ["2.3",
         Paragraph("<b>Guide destination</b><br/>"
                   "<font color='#666666' size='8'>Mots et expressions clés locaux, conseils culturels, budget journalier — "
                   "contenu généré par IA et adapté à chaque pays.</font>", sBody),
         Paragraph("1 200 – 1 800 €", sRight)],
        ["2.4",
         Paragraph("<b>Packs utilisateurs (freemium / premium / pro)</b><br/>"
                   "<font color='#666666' size='8'>Système d'abonnement avec accès différenciés : "
                   "liste basique gratuite, fonctionnalités avancées en premium, multi-voyages en pro.</font>", sBody),
         Paragraph("5 000 – 7 000 €", sRight)],
    ]
    story.append(section_table(v2_rows, col_widths=[9*mm, 130*mm, 31*mm]))
    story.append(Spacer(1, 6*mm))

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 3 — Upsells
    # ══════════════════════════════════════════════════════════════════════════
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_GRAY, spaceAfter=3*mm))
    story.append(Paragraph("3 — Fonctionnalites recommandees (V2/V3)", sSection))
    story.append(Paragraph(
        "Options a fort retour sur investissement, chacune commandable independamment selon vos priorites.",
        sNote))

    # Sous-section ameliorations produit
    story.append(Paragraph("Ameliorations produit", sBold))
    story.append(Spacer(1, 1*mm))
    qw_rows = [
        ["#", Paragraph("Fonctionnalite", sBold), Paragraph("Estimation HT", sBold)],
        ["A",
         Paragraph("<b>Templates de voyage predefined</b><br/>"
                   "<font color='#666666' size='8'>Listes pre-configurees selon le type de trip "
                   "(backpacking, plage, ski, city trip, safari...) accessibles des la page d'accueil.</font>", sBody),
         Paragraph("1 000 €", sRight)],
        ["B",
         Paragraph("<b>Widget integrable Webflow</b><br/>"
                   "<font color='#666666' size='8'>Formulaire de demarrage rapide integrable directement sur dont-forget.co "
                   "pour capter les visiteurs du site marketing sans redirection.</font>", sBody),
         Paragraph("600 €", sRight)],
    ]
    story.append(section_table(qw_rows, col_widths=[9*mm, 130*mm, 31*mm]))
    story.append(Spacer(1, 4*mm))

    # Sous-section engagement
    story.append(Paragraph("Engagement & fidelisation", sBold))
    story.append(Spacer(1, 1*mm))
    eng_rows = [
        ["#", Paragraph("Fonctionnalite", sBold), Paragraph("Estimation HT", sBold)],
        ["C",
         Paragraph("<b>Envoi de la checklist par email</b><br/>"
                   "<font color='#666666' size='8'>Recevoir sa liste par mail avec liens affilies inclus "
                   "(integration Resend ou Mailgun).</font>", sBody),
         Paragraph("1 200 €", sRight)],
        ["D",
         Paragraph("<b>Rappels pre-depart automatiques</b><br/>"
                   "<font color='#666666' size='8'>Emails automatiques J-30, J-15 et J-7 avec recap des produits "
                   "non encore coches — boost direct de conversion affiliee.</font>", sBody),
         Paragraph("1 500 €", sRight)],
        ["E",
         Paragraph("<b>Compte utilisateur & historique voyages</b><br/>"
                   "<font color='#666666' size='8'>Creer un compte pour sauvegarder ses voyages passes et futurs, "
                   "prerequis pour les packs abonnement.</font>", sBody),
         Paragraph("3 000 – 4 500 €", sRight)],
        ["F",
         Paragraph("<b>Mode collaboratif</b><br/>"
                   "<font color='#666666' size='8'>Plusieurs voyageurs modifient la meme checklist — "
                   "ideal pour familles et groupes.</font>", sBody),
         Paragraph("2 500 €", sRight)],
    ]
    story.append(section_table(eng_rows, col_widths=[9*mm, 130*mm, 31*mm]))
    story.append(Spacer(1, 4*mm))

    # Sous-section monetisation
    story.append(Paragraph("Monetisation & croissance", sBold))
    story.append(Spacer(1, 1*mm))
    mon_rows = [
        ["#", Paragraph("Fonctionnalite", sBold), Paragraph("Estimation HT", sBold)],
        ["G",
         Paragraph("<b>Multi-affiliations (Decathlon, FNAC, Cdiscount...)</b><br/>"
                   "<font color='#666666' size='8'>Ajouter d'autres programmes d'affiliation en complement d'Amazon "
                   "— diversifie les revenus et ameliore le taux de clic.</font>", sBody),
         Paragraph("2 000 €", sRight)],
        ["H",
         Paragraph("<b>Pages SEO par destination</b><br/>"
                   "<font color='#666666' size='8'>Pages generees automatiquement Que mettre dans sa valise pour [destination] "
                   "pour capter du trafic organique long terme.</font>", sBody),
         Paragraph("2 500 – 4 000 €", sRight)],
        ["I",
         Paragraph("<b>Dashboard analytics</b><br/>"
                   "<font color='#666666' size='8'>Interface pour visualiser clics, produits les plus recommandes "
                   "et conversions estimees.</font>", sBody),
         Paragraph("2 000 – 3 000 €", sRight)],
        ["J",
         Paragraph("<b>Version B2B / White label agences de voyage</b><br/>"
                   "<font color='#666666' size='8'>L'outil sous la marque d'agences tierces — "
                   "modele SaaS a fort potentiel de revenus recurrents.</font>", sBody),
         Paragraph("6 000 – 12 000 €", sRight)],
    ]
    story.append(section_table(mon_rows, col_widths=[9*mm, 130*mm, 31*mm]))
    story.append(Spacer(1, 4*mm))

    # Sous-section retainer newsletter
    story.append(Paragraph("Accompagnement mensuel — retainer", sBold))
    story.append(Spacer(1, 1*mm))
    ret_rows = [
        ["#", Paragraph("Prestation", sBold), Paragraph("Tarif mensuel HT", sBold)],
        ["K",
         Paragraph("<b>Newsletter destinations & bons plans</b><br/>"
                   "<font color='#666666' size='8'>Envoi mensuel d'une newsletter curee a la communaute Don't Forget : "
                   "destinations tendance, alertes vols et sejours pas chers, conseils saisonniers. "
                   "Contenu redige et integre par tsuno, avec liens affilies inclus — "
                   "canal de revenus recurrents independant du site.</font>", sBody),
         Paragraph("400 – 600 € / mois", sRight)],
    ]
    story.append(section_table(ret_rows, col_widths=[9*mm, 130*mm, 31*mm]))
    story.append(Spacer(1, 6*mm))

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 4 — Conditions
    # ══════════════════════════════════════════════════════════════════════════
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_GRAY, spaceAfter=3*mm))
    story.append(Paragraph("Conditions générales", sSectionDark))

    conditions = [
        "Acompte de <b>40 %</b> à la signature, solde à la livraison.",
        "Tous les prix sont en <b>euros HT</b> — TVA 20 % applicable.",
        "Hébergement Vercel, APIs OpenAI et Google Sheets <b>non inclus</b> — à la charge du client.",
        "Toute modification majeure de cahier des charges en cours de développement fera l'objet d'un <b>avenant tarifé</b>.",
        "Devis valable <b>30 jours</b> à compter de la date d'émission.",
        "Les prestations V2/V3 sont indépendantes et peuvent être commandées séparément.",
    ]
    for c in conditions:
        story.append(Paragraph(f"• &nbsp; {c}", sCond))

    doc.build(story)
    print(f"PDF genere : {os.path.abspath(OUTPUT)}")

if __name__ == "__main__":
    build()
