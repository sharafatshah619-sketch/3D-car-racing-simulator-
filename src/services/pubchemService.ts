export interface PubChemCompoundDetails {
  cid: number;
  molecularFormula: string;
  molecularWeight: number;
  iupacName: string;
  inchiKey?: string;
  canonicalSmiles?: string;
  imageUrl: string;
}

const cache = new Map<number, PubChemCompoundDetails>();

export async function fetchPubChemDetails(cid: number): Promise<PubChemCompoundDetails | null> {
  if (cache.has(cid)) {
    return cache.get(cid)!;
  }

  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName,InChIKey,CanonicalSMILES/JSON`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`PubChem API returned status ${response.status} for CID ${cid}`);
      return null;
    }

    const data = await response.json();
    const props = data?.PropertyTable?.Properties?.[0];

    if (!props) {
      return null;
    }

    const details: PubChemCompoundDetails = {
      cid: props.CID || cid,
      molecularFormula: props.MolecularFormula || '',
      molecularWeight: parseFloat(props.MolecularWeight) || 0,
      iupacName: props.IUPACName || '',
      inchiKey: props.InChIKey,
      canonicalSmiles: props.CanonicalSMILES,
      imageUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=300x300`,
    };

    cache.set(cid, details);
    return details;
  } catch (error) {
    console.warn(`Error fetching PubChem data for CID ${cid}:`, error);
    return null;
  }
}
