import AdminCrudPage from './AdminCrudPage'
import genreService from '../../services/genreService'

export default function GenreManagementPage() {
  return <AdminCrudPage title="Quản lý thể loại" entityName="thể loại" service={genreService} />
}
