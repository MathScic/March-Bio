"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Produit = {
  id: string;
  nom: string;
  categorie: string;
  unite: string;
  prix: number;
  disponible: boolean;
};

type LignePanier = { produit: Produit; quantite: number };

export default function CataloguePage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const router = useRouter();

  useEffect(() => {
    supabase
      .from("produits")
      .select("*")
      .order("categorie")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setProduits(data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Chargement…</p>;
  if (error) return <p>Erreur : {error}</p>;

  const categories = Array.from(new Set(produits.map((p) => p.categorie)));
  const nbArticles = panier.reduce((s, l) => s + l.quantite, 0);
  const total = panier.reduce((s, l) => s + l.produit.prix * l.quantite, 0);

  function ajouter(p: Produit) {
    setPanier((prev) => {
      const ligne = prev.find((l) => l.produit.id === p.id);
      if (ligne) {
        return prev.map((l) => (l.produit.id === p.id ? { ...l, quantite: l.quantite + 1 } : l));
      }
      return [...prev, { produit: p, quantite: 1 }];
    });
  }

  function supprimer(id: string) {
    setPanier((prev) => prev.filter((l) => l.produit.id !== id));
  }

  function validerAchat() {
    router.push("/commande");
  }

  function afficherUnite(quantite: number, unite: string) {
    const pluriel = quantite > 1 && unite !== "kg" && !unite.endsWith("s");
    return `${quantite} ${unite}${pluriel ? "s" : ""}`;
  }

  return (
    <div className="mx-auto flex w-[90%] flex-col gap-8 p-4 lg:flex-row">
      <div className="flex-1">
        <h1 className="mb-4 text-2xl font-bold">Catalogue</h1>
        {categories.map((cat) => (
          <section key={cat} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {cat}
            </h2>
            <ul className="divide-y rounded-lg border">
              {produits
                .filter((p) => p.categorie === cat)
                .map((p) => (
                  <li key={p.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1">
                      <p className="font-medium">{p.nom}</p>
                      <p className="text-sm text-muted-foreground">{p.unite}</p>
                    </div>
                    <span className="font-semibold tabular-nums">{p.prix.toFixed(2)} €</span>
                    {p.disponible ? (
                      <button
                        onClick={() => ajouter(p)}
                        className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                      >
                        Ajouter
                      </button>
                    ) : (
                      <span className="text-sm text-muted-foreground">Indisponible</span>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      <aside className="w-full lg:w-72 lg:shrink-0">
        <div className="sticky top-4 rounded-lg bg-emerald-700 p-4 text-white">
          <h2 className="mb-3 font-semibold">Mon panier ({nbArticles})</h2>
          {panier.length === 0 ? (
            <p className="text-sm text-white/70">Panier vide</p>
          ) : (
            <>
              <ul className="space-y-2">
                {panier.map((l) => (
                  <li key={l.produit.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1">{l.produit.nom}</span>
                    <span className="text-white/70">
                      {afficherUnite(l.quantite, l.produit.unite)}
                    </span>
                    <span className="tabular-nums">
                      {(l.produit.prix * l.quantite).toFixed(2)} €
                    </span>
                    <button
                      onClick={() => supprimer(l.produit.id)}
                      className="text-white/60 hover:text-white"
                      aria-label="Supprimer"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-white/25 pt-3 font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{total.toFixed(2)} €</span>
              </div>
              <button
                onClick={validerAchat}
                className="mt-4 w-full rounded-md bg-white px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Acheter
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
