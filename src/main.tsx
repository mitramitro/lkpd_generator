import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/print.css'
import App from './App.tsx'
import { recompressStoredImages } from './services/imageService'
import { useDocumentStore } from './store/documentStore'

async function bootstrap() {
  await useDocumentStore.getState().loadAll()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  // Rekompresi gambar lama (hasil import sebelum jalur kompresi). Dijalankan
  // sekali seumur penyimpanan (flag meta), ditunda beberapa detik agar tidak
  // berebut dengan print PDF / interaksi awal, dan meng-yield antar gambar.
  setTimeout(() => {
    void recompressStoredImages()
      .then((count) => {
        if (count > 0) console.info(`Rekompresi gambar selesai: ${count} gambar diperkecil`)
      })
      .catch((error) => console.warn('Rekompresi gambar gagal:', error))
  }, 3000)
}

void bootstrap()
