import { adminSeeder } from './admin.seeder'
import { autoOrderPermitDeclinedSeeder } from './autoOrderPermitDeclined.seeder'
import { autoOrderPermitGrantedSeeder } from './autoOrderPermitGranted.seeder'

const args = process.argv.slice(2)

const [seederName] = args

switch (seederName) {
  case 'admins':
    adminSeeder()
      .then((users) => {
        console.log('Admin users seeded successfully:', users)
        process.exit(0)
      })
      .catch((error) => {
        console.error('Error seeding admin users:', error)
        process.exit(1)
      })
    break
  case 'auto-order-permit-declined':
    autoOrderPermitDeclinedSeeder()
      .then((result) => {
        console.log('Auto-order permit declined users updated:', result)
        process.exit(0)
      })
      .catch((error) => {
        console.error('Error updating auto-order permit declined users:', error)
        process.exit(1)
      })
    break
  case 'auto-order-permit-granted':
    autoOrderPermitGrantedSeeder()
      .then((result) => {
        console.log('Auto-order permit granted users updated:', result)
        process.exit(0)
      })
      .catch((error) => {
        console.error('Error updating auto-order permit granted users:', error)
        process.exit(1)
      })
    break
  default:
    console.error(`Unknown seeder: ${seederName}`)
    process.exit(1)
    break
}
