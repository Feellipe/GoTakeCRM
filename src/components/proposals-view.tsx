'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Package,
  Link as LinkIcon,
  ChevronRight,
  Sparkles,
  Calendar,
  DollarSign,
  User,
  Briefcase,
  Camera,
  Video,
  Building,
  Users2,
  Star,
  Bookmark,
  Link2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  deliverables: string;
  duration: number;
  category: string;
  active: boolean;
}

interface ProposalTemplate {
  id: string;
  name: string;
  description: string | null;
  defaultTerms: string | null;
  defaultPackages: string | null;
  isActive: boolean;
  _count?: { proposals: number };
}

interface Proposal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  packages: string;
  customItems: string | null;
  portfolioLinks: string | null;
  terms: string | null;
  validUntil: string | null;
  totalValue: number;
  currency: string;
  notes: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  paymentLink: string | null;
  paymentStatus: string;
  stripeSessionId: string | null;
  createdAt: string;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    avatar: string | null;
  };
  deal: {
    id: string;
    title: string;
    status: string;
    value: number;
  } | null;
  template: {
    id: string;
    name: string;
  } | null;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  avatar: string | null;
}

interface Deal {
  id: string;
  title: string;
  status: string;
  value: number;
  client: {
    id: string;
    name: string;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  sent: 'bg-blue-500',
  viewed: 'bg-purple-500',
  accepted: 'bg-green-500',
  rejected: 'bg-red-500',
  expired: 'bg-orange-500',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
};

const categoryIcons: Record<string, typeof Camera> = {
  photography: Camera,
  videography: Video,
  both: Briefcase,
};

interface ProposalsViewProps {
  clients: Client[];
  onNotification?: (message: string) => void;
  initialDeal?: {
    id: string;
    title: string;
    clientId: string;
    value: number;
  } | null;
  onProposalCreated?: () => void;
}

export function ProposalsView({ clients, onNotification, initialDeal, onProposalCreated }: ProposalsViewProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [showNewProposalModal, setShowNewProposalModal] = useState(false);
  const [showProposalDetail, setShowProposalDetail] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

  // Form states
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [selectedPackages, setSelectedPackages] = useState<Array<{ id: string; customPrice: number }>>([]);
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>(['']);
  const [proposalTerms, setProposalTerms] = useState('');
  const [proposalNotes, setProposalNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [dealId, setDealId] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  // Handle initialDeal from Pipeline
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (initialDeal) {
      setSelectedClient(initialDeal.clientId);
      setProposalTitle(`Proposal for ${initialDeal.title}`);
      setDealId(initialDeal.id);
      setShowNewProposalModal(true);
    }
  }, [initialDeal]);

  useEffect(() => {
    fetchData();
    fetchDeals();
  }, []);

  const fetchData = async () => {
    try {
      const [proposalsRes, packagesRes, templatesRes] = await Promise.all([
        fetch('/api/proposals'),
        fetch('/api/packages'),
        fetch('/api/proposal-templates'),
      ]);
      const proposalsData = await proposalsRes.json();
      const packagesData = await packagesRes.json();
      const templatesData = await templatesRes.json();
      setProposals(proposalsData);
      setPackages(packagesData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeals = async () => {
    try {
      const res = await fetch('/api/deals');
      const data = await res.json();
      setDeals(data);
    } catch (error) {
      console.error('Error fetching deals:', error);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setProposalTerms(template.defaultTerms || '');
      if (template.defaultPackages) {
        const defaultPkgIds = JSON.parse(template.defaultPackages);
        setSelectedPackages(defaultPkgIds.map((id: string) => ({ id, customPrice: 0 })));
      }
    }
  };

  const handlePackageToggle = (pkgId: string) => {
    setSelectedPackages(prev => {
      const exists = prev.find(p => p.id === pkgId);
      if (exists) {
        return prev.filter(p => p.id !== pkgId);
      }
      const pkg = packages.find(p => p.id === pkgId);
      return [...prev, { id: pkgId, customPrice: pkg?.price || 0 }];
    });
  };

  const handlePackagePriceChange = (pkgId: string, price: number) => {
    setSelectedPackages(prev =>
      prev.map(p => (p.id === pkgId ? { ...p, customPrice: price } : p))
    );
  };

  const calculateTotal = () => {
    return selectedPackages.reduce((sum, p) => {
      const pkg = packages.find(pkg => pkg.id === p.id);
      return sum + (p.customPrice || pkg?.price || 0);
    }, 0);
  };

  const handleSaveProposal = async () => {
    if (!selectedClient || !proposalTitle) return;

    try {
      const proposalData = {
        clientId: selectedClient,
        dealId: dealId || null,
        templateId: selectedTemplate || null,
        title: proposalTitle,
        description: proposalDescription,
        packages: selectedPackages.map(p => {
          const pkg = packages.find(pkg => pkg.id === p.id);
          return {
            id: p.id,
            name: pkg?.name,
            description: pkg?.description,
            originalPrice: pkg?.price,
            customPrice: p.customPrice || pkg?.price,
            deliverables: pkg?.deliverables ? JSON.parse(pkg.deliverables) : [],
            duration: pkg?.duration,
          };
        }),
        portfolioLinks: portfolioLinks.filter(l => l.trim()),
        terms: proposalTerms,
        validUntil: validUntil || null,
        totalValue: calculateTotal(),
        notes: proposalNotes,
      };

      if (editingProposal?.id) {
        await fetch(`/api/proposals/${editingProposal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...proposalData, status: editingProposal.status }),
        });
      } else {
        await fetch('/api/proposals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proposalData),
        });
      }

      fetchData();
      resetForm();
      setShowNewProposalModal(false);
      onNotification?.('Proposal saved successfully!');
      onProposalCreated?.();
    } catch (error) {
      console.error('Error saving proposal:', error);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return;

    try {
      const templateData = {
        name: templateName,
        description: templateDescription || `Template created from "${proposalTitle}"`,
        defaultTerms: proposalTerms,
        defaultPackages: selectedPackages.map(p => p.id),
      };

      await fetch('/api/proposal-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      fetchData();
      setShowSaveTemplateDialog(false);
      setTemplateName('');
      setTemplateDescription('');
      onNotification?.('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleAddToDeal = async () => {
    if (!dealId || !editingProposal?.id) return;

    try {
      await fetch(`/api/proposals/${editingProposal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingProposal,
          dealId: dealId,
        }),
      });

      fetchData();
      onNotification?.('Proposal linked to deal successfully!');
    } catch (error) {
      console.error('Error linking proposal to deal:', error);
    }
  };

  const handleSendProposal = async (proposal: Proposal) => {
    try {
      await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...proposal, status: 'sent' }),
      });
      fetchData();
      onNotification?.('Proposal sent successfully!');
    } catch (error) {
      console.error('Error sending proposal:', error);
    }
  };

  const handleDeleteProposal = async (id: string) => {
    try {
      await fetch(`/api/proposals/${id}`, { method: 'DELETE' });
      fetchData();
      setSelectedProposal(null);
      setShowProposalDetail(false);
      onNotification?.('Proposal deleted successfully!');
    } catch (error) {
      console.error('Error deleting proposal:', error);
    }
  };

  const handleGeneratePaymentLink = async (proposal: Proposal) => {
    setGeneratingPaymentLink(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: proposal.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedProposal(prev => prev ? {
          ...prev,
          paymentLink: data.url,
          stripeSessionId: data.sessionId,
          paymentStatus: 'pending',
        } as Proposal : null);
        onNotification?.('Payment link generated!');
      } else {
        const err = await res.json();
        onNotification?.(err.error || 'Failed to generate payment link');
      }
    } catch (error) {
      console.error('Error generating payment link:', error);
      onNotification?.('Failed to generate payment link');
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  const handleCopyPaymentLink = () => {
    if (selectedProposal?.paymentLink) {
      navigator.clipboard.writeText(selectedProposal.paymentLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      onNotification?.('Payment link copied!');
    }
  };

  const resetForm = () => {
    setSelectedTemplate('');
    setSelectedClient('');
    setProposalTitle('');
    setProposalDescription('');
    setSelectedPackages([]);
    setPortfolioLinks(['']);
    setProposalTerms('');
    setProposalNotes('');
    setValidUntil('');
    setDealId(null);
    setEditingProposal(null);
  };

  const openEditProposal = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setSelectedClient(proposal.client.id);
    setProposalTitle(proposal.title);
    setProposalDescription(proposal.description || '');
    setSelectedTemplate(proposal.template?.id || '');
    
    const pkgData = JSON.parse(proposal.packages || '[]');
    setSelectedPackages(pkgData.map((p: { id: string; customPrice?: number }) => ({ id: p.id, customPrice: p.customPrice || 0 })));
    
    setPortfolioLinks(proposal.portfolioLinks ? JSON.parse(proposal.portfolioLinks) : ['']);
    setProposalTerms(proposal.terms || '');
    setProposalNotes(proposal.notes || '');
    setValidUntil(proposal.validUntil ? proposal.validUntil.split('T')[0] : '');
    
    setShowProposalDetail(false);
    setShowNewProposalModal(true);
  };

  const filteredProposals = proposals.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getProposalStats = () => {
    const stats = {
      total: proposals.length,
      draft: proposals.filter(p => p.status === 'draft').length,
      sent: proposals.filter(p => p.status === 'sent').length,
      accepted: proposals.filter(p => p.status === 'accepted').length,
      totalValue: proposals.reduce((sum, p) => sum + p.totalValue, 0),
    };
    return stats;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Sparkles className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  const stats = getProposalStats();

  return (
    <div className="p-8 space-y-8 flex-1">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Proposals</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold text-foreground">{stats.draft}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-500/10 flex items-center justify-center">
                <Edit className="w-6 h-6 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold text-foreground">{stats.accepted}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalValue)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Proposal Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((template, index) => (
              <div
                key={template.id}
                className="p-5 rounded-xl border border-glass-border bg-muted/30 hover:bg-muted/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer group animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => {
                  setSelectedTemplate(template.id);
                  handleTemplateChange(template.id);
                  setSelectedClient('');
                  setProposalTitle('');
                  setProposalDescription('');
                  resetForm();
                  setSelectedTemplate(template.id);
                  handleTemplateChange(template.id);
                  setShowNewProposalModal(true);
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {template.name}
                  </h4>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="w-3 h-3" />
                  <span>{template._count?.proposals || 0} proposals</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search proposals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 glass-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className="gradient-gold text-warm-950"
          onClick={() => {
            resetForm();
            setShowNewProposalModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Proposal
        </Button>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {filteredProposals.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No proposals found</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first proposal to get started</p>
            </CardContent>
          </Card>
        ) : (
          filteredProposals.map(proposal => (
            <Card
              key={proposal.id}
              className="glass-card cursor-pointer hover:shadow-xl transition-all duration-300 group"
              onClick={() => {
                setSelectedProposal(proposal);
                setShowProposalDetail(true);
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12 border-2 border-glass-border">
                      <AvatarImage src={proposal.client.avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {proposal.client.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {proposal.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{proposal.client.name}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Package className="w-4 h-4" />
                          <span>{JSON.parse(proposal.packages).length} packages</span>
                        </div>
                        {proposal.template && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <FileText className="w-4 h-4" />
                            <span>{proposal.template.name}</span>
                          </div>
                        )}
                        {proposal.deal && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Briefcase className="w-4 h-4" />
                            <span className="truncate max-w-[120px]">{proposal.deal.title}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(proposal.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{formatCurrency(proposal.totalValue)}</p>
                    <Badge className={`${statusColors[proposal.status]} text-white mt-2`}>
                      {statusLabels[proposal.status]}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* New/Edit Proposal Modal */}
      <Dialog open={showNewProposalModal} onOpenChange={(open) => {
        setShowNewProposalModal(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>{editingProposal ? 'Edit Proposal' : 'Create New Proposal'}</DialogTitle>
            <DialogDescription>
              Build a custom proposal with packages, pricing, and portfolio links
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="space-y-6 pb-6">
              {/* Template Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Template</label>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Deal Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Link to Deal (Optional)
                </label>
                <Select value={dealId || ''} onValueChange={setDealId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a deal to link this proposal" />
                  </SelectTrigger>
                  <SelectContent>
                    {deals.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        <div className="flex items-center gap-2">
                          <span>{d.title}</span>
                          <span className="text-muted-foreground">- {d.client.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dealId && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                    <Link2 className="w-4 h-4 text-primary" />
                    <span>Linked to: {deals.find(d => d.id === dealId)?.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 px-2 text-xs"
                      onClick={() => setDealId(null)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {/* Client Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Client *</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Proposal Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Proposal Title *</label>
                <Input
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  placeholder="e.g., Wedding Photography Package"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={proposalDescription}
                  onChange={(e) => setProposalDescription(e.target.value)}
                  placeholder="Brief description of the proposal..."
                  rows={2}
                />
              </div>

              {/* Packages Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Packages</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {packages.map(pkg => {
                    const isSelected = selectedPackages.some(p => p.id === pkg.id);
                    const selectedPkg = selectedPackages.find(p => p.id === pkg.id);
                    const CategoryIcon = categoryIcons[pkg.category] || Package;
                    
                    return (
                      <div
                        key={pkg.id}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-glass-border hover:border-primary/50'
                        }`}
                        onClick={() => handlePackageToggle(pkg.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-primary text-white' : 'bg-muted'
                            }`}>
                              <CategoryIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{pkg.name}</h4>
                              <p className="text-xs text-muted-foreground">{pkg.duration}h</p>
                            </div>
                          </div>
                          <p className="font-bold text-primary">{formatCurrency(pkg.price)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{pkg.description}</p>
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-glass-border">
                            <label className="text-xs text-muted-foreground">Custom Price</label>
                            <Input
                              type="number"
                              value={selectedPkg?.customPrice || pkg.price}
                              onChange={(e) => handlePackagePriceChange(pkg.id, Number(e.target.value))}
                              className="mt-1"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Portfolio Links */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Portfolio Links</label>
                {portfolioLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={link}
                      onChange={(e) => {
                        const newLinks = [...portfolioLinks];
                        newLinks[index] = e.target.value;
                        setPortfolioLinks(newLinks);
                      }}
                      placeholder="https://your-portfolio.com/work"
                      className="flex-1"
                    />
                    {index === portfolioLinks.length - 1 && (
                      <Button
                        variant="outline"
                        onClick={() => setPortfolioLinks([...portfolioLinks, ''])}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Terms */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Terms & Conditions</label>
                <Textarea
                  value={proposalTerms}
                  onChange={(e) => setProposalTerms(e.target.value)}
                  placeholder="Payment terms, timeline, and conditions..."
                  rows={4}
                />
              </div>

              {/* Valid Until */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Valid Until</label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Internal Notes</label>
                <Textarea
                  value={proposalNotes}
                  onChange={(e) => setProposalNotes(e.target.value)}
                  placeholder="Private notes about this proposal..."
                  rows={2}
                />
              </div>

              {/* Total */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Value</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(calculateTotal())}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between gap-3 px-6 py-4 border-t bg-background">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveTemplateDialog(true)}
                disabled={selectedPackages.length === 0}
                className="flex items-center gap-2"
              >
                <Bookmark className="w-4 h-4" />
                Save as Template
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (dealId) {
                    handleSaveProposal();
                  }
                }}
                disabled={!dealId || !selectedClient || !proposalTitle}
                className="flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                Add to Deal
              </Button>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setShowNewProposalModal(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button
                className="gradient-gold text-warm-950"
                onClick={handleSaveProposal}
                disabled={!selectedClient || !proposalTitle}
              >
                {editingProposal ? 'Update Proposal' : 'Save Draft'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save as Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-primary" />
              Save as Template
            </DialogTitle>
            <DialogDescription>
              Save this proposal configuration as a reusable template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name *</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Wedding Photography Standard"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Brief description of this template..."
                rows={3}
              />
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium">Template will include:</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• {selectedPackages.length} package(s)</li>
                <li>• Terms & conditions</li>
                <li>• Package pricing</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>
              Cancel
            </Button>
            <Button
              className="gradient-gold text-warm-950"
              onClick={handleSaveAsTemplate}
              disabled={!templateName.trim()}
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Proposal Detail Sheet */}
      <Sheet open={showProposalDetail} onOpenChange={setShowProposalDetail}>
        <SheetContent className="max-w-2xl overflow-y-auto">
          {selectedProposal && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedProposal.title}
                  <Badge className={`${statusColors[selectedProposal.status]} text-white`}>
                    {statusLabels[selectedProposal.status]}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  Proposal for {selectedProposal.client.name}
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Client Info */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={selectedProposal.client.avatar || undefined} />
                    <AvatarFallback>{selectedProposal.client.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedProposal.client.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedProposal.client.email || selectedProposal.client.phone}</p>
                  </div>
                </div>

                {/* Deal Info */}
                {selectedProposal.deal && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Linked Deal</p>
                      <p className="font-medium text-foreground">{selectedProposal.deal.title}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {statusLabels[selectedProposal.deal.status] || selectedProposal.deal.status}
                    </Badge>
                  </div>
                )}

                {/* Total Value */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Value</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(selectedProposal.totalValue)}</span>
                  </div>
                </div>

                {/* Packages */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Selected Packages
                  </h4>
                  {JSON.parse(selectedProposal.packages).map((pkg: { name: string; description?: string; customPrice: number; originalPrice?: number; deliverables?: string[] }, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{pkg.name}</span>
                        <span className="font-bold text-primary">{formatCurrency(pkg.customPrice)}</span>
                      </div>
                      {pkg.deliverables && pkg.deliverables.length > 0 && (
                        <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                          {pkg.deliverables.slice(0, 3).map((d: string, i: number) => (
                            <li key={i} className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                {/* Portfolio Links */}
                {selectedProposal.portfolioLinks && JSON.parse(selectedProposal.portfolioLinks).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-primary" />
                      Portfolio Links
                    </h4>
                    <div className="space-y-2">
                      {JSON.parse(selectedProposal.portfolioLinks).map((link: string, idx: number) => (
                        <a
                          key={idx}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-sm text-primary"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Terms */}
                {selectedProposal.terms && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Terms & Conditions</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 rounded-lg bg-muted/30">
                      {selectedProposal.terms}
                    </p>
                  </div>
                )}

                {/* Timeline */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Created: {new Date(selectedProposal.createdAt).toLocaleDateString()}
                    </div>
                    {selectedProposal.sentAt && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Send className="w-4 h-4" />
                        Sent: {new Date(selectedProposal.sentAt).toLocaleDateString()}
                      </div>
                    )}
                    {selectedProposal.viewedAt && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Eye className="w-4 h-4" />
                        Viewed: {new Date(selectedProposal.viewedAt).toLocaleDateString()}
                      </div>
                    )}
                    {selectedProposal.validUntil && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Valid until: {new Date(selectedProposal.validUntil).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {selectedProposal.status === 'draft' && (
                    <Button
                      className="gradient-gold text-warm-950"
                      onClick={() => handleSendProposal(selectedProposal)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Proposal
                    </Button>
                  )}
                  {selectedProposal.paymentStatus === 'paid' ? (
                    <Badge className="bg-green-500 text-white py-2 px-4">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Paid
                    </Badge>
                  ) : selectedProposal.paymentLink ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleCopyPaymentLink}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        {copiedLink ? 'Copied!' : 'Copy Payment Link'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open(selectedProposal.paymentLink!, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Checkout
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="gradient-gold text-warm-950"
                      onClick={() => handleGeneratePaymentLink(selectedProposal)}
                      disabled={generatingPaymentLink}
                    >
                      {generatingPaymentLink ? (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-4 h-4 mr-2" />
                          Generate Payment Link
                        </>
                      )}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => openEditProposal(selectedProposal)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteProposal(selectedProposal.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
