'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Plus, Trash2, QrCode, Check, X, AlertCircle, IndianRupee, Edit2, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PaymentMethodsAdmin() {
    const [methods, setMethods] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        upiId: '',
        qrImageUrl: ''
    })

    const fetchMethods = async () => {
        try {
            setLoading(true)
            const response = await api.get('/admin/payment-methods')
            setMethods(response.data.data)
        } catch (error) {
            toast.error('Failed to fetch payment methods')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMethods()
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            setFormData({ ...formData, qrImageUrl: reader.result as string })
        }
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.qrImageUrl) {
            return toast.error('Please upload a QR code image')
        }

        try {
            setUploading(true)
            await api.post('/admin/payment-methods', formData)
            toast.success('Payment method added')
            setIsModalOpen(false)
            setFormData({ name: '', upiId: '', qrImageUrl: '' })
            fetchMethods()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to add method')
        } finally {
            setUploading(false)
        }
    }

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await api.put(`/admin/payment-methods/${id}`, { isActive: !currentStatus })
            toast.success(`Method ${!currentStatus ? 'enabled' : 'disabled'}`)
            fetchMethods()
        } catch (error) {
            toast.error('Failed to update status')
        }
    }

    const deleteMethod = async (id: string) => {
        if (!confirm('Are you sure you want to delete this payment method?')) return
        try {
            await api.delete(`/admin/payment-methods/${id}`)
            toast.success('Method deleted')
            fetchMethods()
        } catch (error) {
            toast.error('Failed to delete method')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Dynamic Payment Methods</h2>
                    <p className="text-gray-400">Manage UPI IDs and QR images shown to users on the deposit page.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl font-bold transition-all"
                >
                    <Plus size={20} />
                    Add Method
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="glass rounded-2xl border border-white/5 h-64 animate-pulse" />
                    ))
                ) : methods.length === 0 ? (
                    <div className="col-span-full py-12 text-center glass rounded-2xl border border-white/5">
                        <p className="text-gray-500 font-medium">No methods configured.</p>
                    </div>
                ) : (
                    methods.map((method) => (
                        <div key={method.id} className="glass rounded-2xl border border-white/5 overflow-hidden flex flex-col group hover:border-primary-500/30 transition-all">
                            <div className="relative h-48 bg-white flex items-center justify-center p-4">
                                <img
                                    src={method.qr_image_url}
                                    alt={method.name}
                                    className="h-full object-contain"
                                />
                                <div className={`absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold uppercase border ${method.is_active
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                                    }`}>
                                    {method.is_active ? 'Active' : 'Disabled'}
                                </div>
                            </div>
                            <div className="p-4 flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-lg">{method.name}</p>
                                        <p className="text-sm text-gray-400 font-mono">{method.upi_id}</p>
                                    </div>
                                    <div className="p-2 rounded-full bg-primary-500/10 text-primary-400">
                                        <IndianRupee size={18} />
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-white/5">
                                    <button
                                        onClick={() => toggleStatus(method.id, method.is_active)}
                                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${method.is_active ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
                                    >
                                        {method.is_active ? <X size={14} /> : <Check size={14} />}
                                        {method.is_active ? 'Disable' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => deleteMethod(method.id)}
                                        className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass w-full max-w-md rounded-2xl border border-white/10 shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Add New Payment UPI</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Method Name (e.g. PhonePe)</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary-500"
                                    placeholder="PhonePe / GPay"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">UPI ID</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.upiId}
                                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary-500"
                                    placeholder="example@upi"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5 text-left">QR Image</label>
                                <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:border-primary-500 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    {formData.qrImageUrl ? (
                                        <div className="space-y-2">
                                            <img src={formData.qrImageUrl} alt="Preview" className="mx-auto h-32 object-contain" />
                                            <p className="text-xs text-primary-400">Click to change</p>
                                        </div>
                                    ) : (
                                        <div className="py-4">
                                            <QrCode size={32} className="mx-auto text-gray-600 mb-2" />
                                            <p className="text-sm text-gray-500">Upload QR Image</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
                                >
                                    {uploading ? 'Processing...' : 'Save Method'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
