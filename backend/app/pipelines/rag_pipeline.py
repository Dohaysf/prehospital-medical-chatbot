#!/usr/bin/env python3
# backend/app/pipelines/rag_pipeline.py
# Script d'ingestion des protocoles médicaux PDF → vecteurs

import os
import json
from pathlib import Path

# Configuration
PROTOCOLS_DIR = Path(__file__).parent.parent.parent / "data" / "protocols"
VECTOR_STORE_DIR = Path(__file__).parent.parent.parent / "data" / "vector_store"
OUTPUT_JSON = Path(__file__).parent.parent.parent / "data" / "rag_knowledge_base.json"

def extract_text_from_pdf(pdf_path):
    """Extrait le texte d'un fichier PDF"""
    try:
        import PyPDF2
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            return text
    except ImportError:
        print("⚠️ PyPDF2 non installé. Installez-le avec: pip install PyPDF2")
        return ""

def chunk_text(text, chunk_size=500):
    """Découpe le texte en chunks"""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = ' '.join(words[i:i+chunk_size])
        chunks.append(chunk)
    return chunks

def create_vector_store(chunks):
    """Crée un store vectoriel avec FAISS ou ChromaDB"""
    try:
        import chromadb
        client = chromadb.PersistentClient(path=str(VECTOR_STORE_DIR))
        collection = client.get_or_create_collection(name="medical_protocols")
        
        for i, chunk in enumerate(chunks):
            collection.add(
                documents=[chunk],
                ids=[f"chunk_{i}"]
            )
        print(f"✅ Vector store créé avec {len(chunks)} chunks")
        return collection
    except ImportError:
        print("⚠️ ChromaDB non installé. Installez-le avec: pip install chromadb")
        return None

def main():
    print("🚀 Démarrage du pipeline RAG...")
    
    # 1. Lecture des PDF
    all_chunks = []
    for pdf_file in PROTOCOLS_DIR.glob("*.pdf"):
        print(f"📄 Traitement: {pdf_file.name}")
        text = extract_text_from_pdf(pdf_file)
        chunks = chunk_text(text)
        all_chunks.extend(chunks)
        print(f"   → {len(chunks)} chunks extraits")
    
    # 2. Création du vector store
    if all_chunks:
        create_vector_store(all_chunks)
        print(f"✅ Pipeline terminé: {len(all_chunks)} chunks indexés")
    else:
        print("⚠️ Aucun chunk trouvé. Vérifiez les PDF dans data/protocols/")
    
    # 3. Mise à jour du JSON (optionnel)
    print(f"📝 Base JSON existante: {OUTPUT_JSON}")

if __name__ == "__main__":
    main()