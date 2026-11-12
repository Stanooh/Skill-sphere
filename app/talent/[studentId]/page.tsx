import { TalentProfilePage } from '@/views/TalentProfilePage';

export default function Page({ params }: { params: { studentId: string } }) {
  return <TalentProfilePage studentId={params.studentId} />;
}

