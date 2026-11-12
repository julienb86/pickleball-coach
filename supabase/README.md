# Base de données Supabase

Deux projets Supabase :

- **Principal** : les vraies données. Utilisé par l'app publiée (builds, `eas update`) et par `npm run start:prod`. Ses clés sont dans `.env`.
- **Test** : pour essayer sans risque. Utilisé par `npx expo start` / `npm start`. Ses clés sont dans `.env.development.local` (non versionné). Dans l'app, l'en-tête devient orange avec « TEST · » et les écrans de connexion affichent « Base de test ».

## Règle

Tout nouveau script SQL s'exécute **d'abord sur le projet de test**, on vérifie l'app, **puis** sur le projet principal. Les deux bases évoluent séparément : un script oublié sur l'une des deux fait planter l'app connectée à celle-ci.

## Installer une base neuve

Dans l'éditeur SQL du projet (SQL Editor), exécuter chaque fichier en entier, dans cet ordre :

1. `schema.sql`
2. `002_profile_on_signup.sql`
3. `003_shared_calendar.sql`
4. **Dans l'app connectée à cette base, créer ton compte** avec l'adresse administrateur écrite dans `004_admin_coaches.sql`. Le script 004 échoue si ce compte n'existe pas encore.
5. `004_admin_coaches.sql`
6. `005_delete_accounts.sql`
7. `006_account_approval.sql` : la clé Resend dans le Vault est facultative sur la base de test. Sans elle, aucun email n'est envoyé et les inscriptions marchent quand même.
8. `007_session_program.sql`
9. `008_exercise_library_seed.sql` : charge les 300 exercices de départ.
10. `009_avatars.sql`
11. `011_delete_own_account.sql` : chacun peut supprimer son propre compte depuis l’onglet Profil.
12. `012_wednesday_slots.sql` : séances du mercredi en 2 créneaux (18h-20h, 20h-22h) en plus du lundi.
13. `013_demote_coach.sql` : l’admin peut repasser un coach en joueur.

La base de test démarre vide : elle ne contient pas les données de la base principale.

## Réglages des projets

- Authentication > Sign In / Providers > Email : désactiver « Confirm email » sur **les deux projets** pour l'instant. Sans ça, un nouveau compte ne peut pas se connecter avant d'avoir cliqué le lien reçu par email.
- Un projet gratuit se met en pause après une semaine sans utilisation. Le relancer depuis le tableau de bord (Restore project).
