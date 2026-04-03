"use client";

import React, { useState } from 'react';

import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

import LoadingSpinner from './loading-spinner';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { useAuth } from '@/context/AuthContext';
import TwitterLogo from './Twitterlogo';
import { useTranslation } from 'react-i18next';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const { t } = useTranslation();
  const { login, signup, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = t('email_required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('valid_email');
    }

    if (!formData.password.trim()) {
      newErrors.password = t('password_required');
    } else if (formData.password.length < 6) {
      newErrors.password = t('password_min');
    }

    if (mode === 'signup') {
      if (!formData.username.trim()) {
        newErrors.username = t('username_required');
      } else if (formData.username.length < 3) {
        newErrors.username = t('username_min');
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = t('username_invalid');
      }

      if (!formData.displayName.trim()) {
        newErrors.displayName = t('display_name_required');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isLoading) return;

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
      } else {
        await signup(formData.email, formData.password, formData.username, formData.displayName);
      }
      onClose();
      setFormData({ email: '', password: '', username: '', displayName: '' });
      setErrors({});
    } catch (error) {
      setErrors({ general: t('auth_failed') });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setErrors({});
    setFormData({ email: '', password: '', username: '', displayName: '' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-black border-gray-800 text-white">
        <CardHeader className="relative pb-6">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-gray-900"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <TwitterLogo size="xl" className="text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {mode === 'login' ? t('signin_to_x') : t('create_your_account')}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {errors.general && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-white">{t('display_name')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder={t('display_name')}
                      value={formData.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
                      className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.displayName && (
                    <p className="text-red-400 text-sm">{errors.displayName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white">{t('username')}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                    <Input
                      id="username"
                      type="text"
                      placeholder={t('username')}
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="pl-8 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-red-400 text-sm">{errors.username}</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">{t('email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('email')}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">{t('password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('password')}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10 pr-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm">{errors.password}</p>
              )}
              {mode === 'login' && (
                <div className="flex justify-end">
                  <a
                    href="/forgot-password"
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      onClose();
                      window.location.href = '/forgot-password';
                    }}
                  >
                    {t('forgot_password')}
                  </a>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-full text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>{mode === 'login' ? t('signing_in') : t('creating_account')}</span>
                </div>
              ) : (
                mode === 'login' ? t('sign_in_btn') : t('create_account_btn')
              )}
            </Button>
          </form>

          <div className="relative">
            <Separator className="bg-gray-700" />
            <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black px-2 text-gray-400 text-sm">
              {t('or')}
            </span>
          </div>

          <div className="text-center">
            <p className="text-gray-400">
              {mode === 'login' ? t('dont_have_account') : t('already_have_account')}
              <Button
                variant="link"
                className="text-blue-400 hover:text-blue-300 font-semibold pl-1"
                onClick={switchMode}
                disabled={isLoading}
              >
                {mode === 'login' ? t('sign_up_link') : t('login')}
              </Button>
            </p>
          </div>

          {mode === 'signup' && (
            <div className="text-center text-xs text-gray-400">
              {t('terms_footer')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}