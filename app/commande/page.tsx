"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Produit = { id: string; nom: string; unite: string; prix: number };

export default function CommandePage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [quantites, setQuantites] = useState<Record<string, number>>({});
  const [dateLivraison, setDateLivraison] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      // le resto rattaché au compte connecté
      let monClient: string | null = null;
      if (user) {
        const { data: profil } = await supabase
          .from("profiles")
          .select("client_id")
          .eq("id", user.id)
          .single();
        monClient = profil?.client_id ?? null;
      }

      const { data: prods } = await supabase
        .from("produits")
        .select("id, nom, unite, prix")
        .eq("disponible", true)
        .order("nom");

      setProduits(prods ?? []);
      setClientId(monClient);
      setLoading(false);
    }
    load();
  }, []);

  function setQuantite(id: string, valeur: number) {
    setQuantites((q) => ({ ...q, [id]: valeur }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!clientId) return setMessage("Aucun client trouvé.");
    if (!dateLivraison) return setMessage("Choisis une date de livraison.");

    const lignes = produits
      .filter((p) => (quantites[p.id] ?? 0) > 0)
      .map((p) => ({ produit_id: p.id, quantite: quantites[p.id] }));

    if (lignes.length === 0) return setMessage("Ajoute au moins un produit.");

    const { data: commande, error: e1 } = await supabase
      .from("commandes")
      .insert({ client_id: clientId, date_livraison: dateLivraison })
      .select()
      .single();
    if (e1 || !commande) return setMessage("Erreur : " + e1?.message);

    const { error: e2 } = await supabase
      .from("lignes_commande")
      .insert(lignes.map((l) => ({ ...l, commande_id: commande.id })));
    if (e2) return setMessage("Erreur lignes : " + e2.message);

    setMessage(`Commande créée ! (${lignes.length} produit(s))`);
    setQuantites({});
  }

  if (loading) return <p>Chargement…</p>;

  return (
    <form onSubmit={handleSubmit}>
      <h1>Passer une commande</h1>

      <label>
        Date de livraison :{" "}
        <input
          type="date"
          value={dateLivraison}
          onChange={(e) => setDateLivraison(e.target.value)}
          required
        />
      </label>

      <ul>
        {produits.map((p) => (
          <li key={p.id}>
            {p.nom} ({p.prix.toFixed(2)} € / {p.unite}) :{" "}
            <input
              type="number"
              min="0"
              step="0.5"
              value={quantites[p.id] ?? 0}
              onChange={(e) => setQuantite(p.id, Number(e.target.value))}
            />
          </li>
        ))}
      </ul>

      <button type="submit">Valider la commande</button>
      {message && <p>{message}</p>}
    </form>
  );
}
