# Politique de confidentialité — Sistrs

*Brouillon de travail, à faire relire par un juriste avant toute mise en
ligne effective sur les stores. Dernière mise à jour : 19 octobre 2026.*

## 1. Qui sommes-nous

Sistrs ("l'Application", "nous") est une application mobile permettant
d'organiser et de participer à des événements/sorties réservés aux femmes
(soirées bar, ciné, restau, etc.), avec une messagerie et des canaux par
organisatrice.

Responsable du traitement : Nicolas Poda (éditeur de l'Application).
Contact pour toute question relative à vos données personnelles :
nicolaspoda31@gmail.com.

*(À compléter avant publication si une structure juridique — entreprise
individuelle, société — est créée pour l'exploitation de l'Application.)*

## 2. Données que nous collectons

### 2.1 Données fournies à l'inscription et dans votre profil

- Prénom, nom
- Date de naissance (et tranche d'âge déclarée : 18-25, 26-30, 30+)
- Genre déclaré
- Bio (facultatif)
- Photo de profil (avatar) et photo de bannière (facultatif)
- Pièce d'identité (CNI, passeport ou permis de conduire), sous forme de
  photo que vous choisissez de téléverser

### 2.2 Données générées par votre utilisation de l'Application

- Historique de participation aux événements (nombre d'événements
  confirmés), utilisé pour calculer un statut d'activité (commun, bronze,
  argent, or, diamant)
- Messages échangés avec d'autres utilisatrices (messagerie privée) et
  publications dans les canaux des organisatrices
- Réponses aux sondages créés dans les canaux
- Relations d'amitié entre utilisatrices (demandes, acceptations)
- Notifications reçues et leur statut de lecture
- Position géographique, uniquement lorsque vous consultez la carte d'un
  événement ou utilisez une fonctionnalité de géolocalisation
- Identifiant d'appareil utilisé pour l'envoi de notifications push

### 2.3 Ce que nous ne collectons pas

- Nous n'effectuons aucune vérification faciale ni lecture de document
  d'identité officielle (pas de lecture MRZ, pas de comparaison
  biométrique avec un prestataire tiers).
- La biométrie Face ID / Touch ID utilisée dans l'Application (pour
  déverrouiller l'app ou confirmer une inscription à un événement) est
  gérée entièrement par le système de votre téléphone (iOS/Android) : elle
  ne quitte jamais votre appareil et n'est à aucun moment transmise, vue ou
  stockée par Sistrs. Elle confirme uniquement que vous êtes la même
  personne qui a configuré le téléphone, pas votre identité civile.

## 3. Pourquoi nous utilisons vos données

- Créer et gérer votre compte, afficher votre profil aux autres
  utilisatrices
- Réserver l'accès à l'Application aux femmes : le champ genre déclaré à
  l'inscription sert à appliquer cette restriction. En version publiée sur
  les stores, seule la valeur "femme" est acceptée à l'inscription.
- Vous permettre de créer, rejoindre et gérer des événements, canaux,
  discussions et sondages
- Calculer votre statut d'activité en fonction de votre participation aux
  événements
- Vous envoyer des notifications liées à l'Application (rappel
  d'événement, nouveau message, mise à jour d'un événement, etc.)
- Afficher une carte et un itinéraire pour les événements à venir
- Effectuer un contrôle de cohérence facultatif entre les informations
  saisies (nom, prénom, date de naissance) et le document d'identité
  téléversé, à titre d'aide et d'avertissement non bloquant — voir section 5

## 4. Base légale et consentement

Le traitement de vos données repose sur :
- L'exécution du contrat conclu avec vous lors de la création de votre
  compte (fourniture du service) ;
- Votre consentement explicite pour le téléversement de votre pièce
  d'identité, qui reste à tout moment facultatif ;
- Votre consentement pour l'utilisation de la géolocalisation et des
  notifications push, gérés via les autorisations de votre système
  d'exploitation.

## 5. Vérification d'identité — ce que l'Application fait et ne fait pas

Sistrs n'a, à ce jour, recours à aucun prestataire professionnel de
vérification d'identité (KYC). Le document d'identité que vous téléversez
est stocké de façon privée (voir section 7) et fait seulement l'objet d'une
reconnaissance de texte (OCR) effectuée **directement sur votre appareil**
(aucune image n'est envoyée à un service tiers d'analyse) pour comparer le
texte détecté à votre prénom, nom et date de naissance déclarés. Ce
contrôle est purement indicatif et peut être ignoré : il ne constitue pas
une vérification d'identité fiable (pas de détection de faux documents, pas
de lecture de la zone de lecture optique, pas de comparaison avec une
base officielle).

## 6. Partage des données

Nous ne vendons pas vos données. Elles sont partagées uniquement avec les
prestataires techniques nécessaires au fonctionnement de l'Application,
qui agissent comme sous-traitants :

- **Supabase** (hébergement de la base de données, authentification,
  stockage des fichiers et fonctions serveur) ;
- **Expo** (service gratuit d'envoi des notifications push) ;
- **Mapbox** (affichage des cartes dans le détail d'un événement).

Les autres utilisatrices de l'Application voient les informations de
votre profil que vous choisissez de rendre visibles (prénom, avatar, bio,
statut), ainsi que vos publications dans les canaux, vos messages privés
avec elles, et vos relations d'amitié.

## 7. Où et comment vos données sont stockées

- Les données de profil et d'activité sont stockées dans une base de
  données Postgres hébergée par Supabase.
- Vos photos de profil et de bannière sont stockées dans un espace de
  stockage public (nécessaire pour qu'elles s'affichent dans
  l'Application).
- Votre pièce d'identité est stockée dans un espace de stockage **privé**,
  accessible uniquement par vous-même et, en cas de besoin de modération,
  par les administrateurs de l'Application. Elle n'est jamais rendue
  publique ni partagée avec les autres utilisatrices.

## 8. Conservation des données

Vos données sont conservées tant que votre compte existe. En cas de
suppression de votre compte, vos données personnelles (profil, pièce
d'identité, messages) sont supprimées, à l'exception des informations
nécessaires au respect d'obligations légales le cas échéant.

## 9. Vos droits

Conformément au Règlement Général sur la Protection des Données (RGPD),
vous disposez des droits suivants concernant vos données personnelles :
droit d'accès, de rectification, d'effacement, de limitation du
traitement, d'opposition et de portabilité. Vous pouvez également retirer
à tout moment votre consentement au téléversement de votre pièce
d'identité en la supprimant depuis votre profil.

Pour exercer ces droits, contactez-nous à : nicolaspoda31@gmail.com.

Vous pouvez également introduire une réclamation auprès de la Commission
Nationale de l'Informatique et des Libertés (CNIL) si vous estimez que vos
droits ne sont pas respectés.

## 10. Âge minimum

L'Application est réservée aux personnes majeures (18 ans et plus). Nous
ne collectons pas sciemment de données concernant des personnes mineures.

## 11. Sécurité

Nous mettons en œuvre des mesures techniques raisonnables pour protéger
vos données (stockage privé pour les documents d'identité, authentification
sécurisée). Aucune méthode de transmission ou de stockage n'étant
totalement sécurisée, nous ne pouvons garantir une sécurité absolue.

## 12. Modifications de cette politique

Cette politique peut être mise à jour. La date de dernière mise à jour est
indiquée en haut de ce document. En cas de changement significatif, nous
vous en informerons via l'Application.

## 13. Contact

Pour toute question relative à cette politique de confidentialité ou au
traitement de vos données : nicolaspoda31@gmail.com.
