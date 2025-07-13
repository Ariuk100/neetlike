'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function TeacherHome() {
 

  return (
    <main className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-xl">Багшийн самбар</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-gray-700">Та багшийн системд амжилттай нэвтэрлээ.</p>
       
        </CardContent>
      </Card>
    </main>
  )
}