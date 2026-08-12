export class CreateInviteDto {
  email!: string;
  role?: 'ADMIN' | 'MEMBER';
}
