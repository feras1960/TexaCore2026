
import React, { useEffect, useState } from 'react';
import { UserProfile, userProfilesService } from '@/services/userProfilesService';
import { Loader2, Mail, Phone, Shield, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/app/providers/LanguageProvider';

interface CompanyUsersListProps {
    companyId: string;
}

export const CompanyUsersList: React.FC<CompanyUsersListProps> = ({ companyId }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    useEffect(() => {
        const fetchUsers = async () => {
            if (!companyId) return;
            try {
                setLoading(true);
                const data = await userProfilesService.getByCompanyId(companyId);
                setUsers(data);
            } catch (error) {
                console.error('Failed to load users', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [companyId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <User className="w-12 h-12 mb-4 opacity-50" />
                <p>{t('saas.noUsersFound', 'No users found for this company')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-accent/5 transition-colors">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || ''} />
                            <AvatarFallback>{user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium text-sm text-card-foreground">{user.full_name || t('common.unknown', 'Unknown')}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {user.email}
                                </span>
                                {user.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {user.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {user.role}
                        </Badge>
                    </div>
                </div>
            ))}
        </div>
    );
};
