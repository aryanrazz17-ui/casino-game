'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Plus, Trash2, QrCode, Check, X, AlertCircle, IndianRupee, Edit2, Save, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PaymentMethodsAdmin() {
    const [methods, setMethods] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string>('')

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

        setSelectedFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const submitData = new FormData()
        submitData.append('name', formData.name)
        submitData.append('upiId', formData.upiId)

        if (selectedFile) {
            submitData.append('qr_image', selectedFile)
        } else if (formData.qrImageUrl) {
            submitData.append('qrImageUrl', formData.qrImageUrl)
        }

        try {
            setUploading(true)
            if (editingId) {
                await api.put(`/admin/payment-methods/${editingId}`, submitData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                toast.success('Payment method updated')
            } else {
                await api.post('/admin/payment-methods', submitData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                toast.success('Payment method added')
            }
            setIsModalOpen(false)
            setEditingId(null)
            setSelectedFile(null)
            setPreviewUrl('')
            setFormData({ name: '', upiId: '', qrImageUrl: '' })
            fetchMethods()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save method')
        } finally {
            setUploading(false)
        }
    }

    const handleEdit = (method: any) => {
        setFormData({
            name: method.name,
            upiId: method.upi_id,
            qrImageUrl: method.qr_image_url
        })
        setPreviewUrl(method.qr_image_url)
        setEditingId(method.id)
        setSelectedFile(null)
        setIsModalOpen(true)
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

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingId(null)
        setSelectedFile(null)
        setPreviewUrl('')
        setFormData({ name: '', upiId: '', qrImageUrl: '' })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Manual Payment Methods</h2>
                    <p className="text-gray-400 text-sm">Configure UPI and QR codes for manual deposit system.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null)
                        setFormData({ name: '', upiId: '', qrImageUrl: '' })
                        setPreviewUrl('')
                        setSelectedFile(null)
                        setIsModalOpen(true)
                    }}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-primary-600/20"
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
                        <IndianRupee className="mx-auto text-gray-700 mb-4" size={48} />
                        <p className="text-gray-500 font-medium">No methods configured.</p>
                    </div>
                ) : (
                    methods.map((method) => (
                        <div key={method.id} className="glass rounded-2xl border border-white/5 overflow-hidden flex flex-col group hover:border-primary-500/30 transition-all">
                            <div className="relative h-48 bg-white flex items-center justify-center p-4">
                                {method.qr_image_url ? (
                                    <img
                                        src={method.qr_image_url}
                                        alt={method.name}
                                        className="h-full object-contain"
                                    />
                                ) : (
                                    <QrCode size={48} className="text-gray-200" />
                                )}
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
                                    <button
                                        onClick={() => handleEdit(method)}
                                        className="p-2 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-all"
                                    >
                                        <Edit2 size={16} />
                                    </button>
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
                    <div className="glass w-full max-w-md rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-xl font-bold">{editingId ? 'Edit' : 'Add New'} Payment Method</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Method Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary-500"
                                    placeholder="e.g. Google Pay, PhonePe"
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
                                    placeholder="merchant@upi"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">QR Image URL (Optional if uploading)</label>
                                <input
                                    type="text"
                                    value={formData.qrImageUrl.startsWith('data:') ? '' : formData.qrImageUrl}
                                    onChange={(e) => setFormData({ ...formData, qrImageUrl: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary-500"
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
                                <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-600"><span className="bg-[#121214] px-2 text-gray-500">OR UPLOAD</span></div>
                            </div>
                            <div>
                                <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:border-primary-500 transition-colors cursor-pointer relative group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    {previewUrl ? (
                                        <div className="space-y-2">
                                            <img src={previewUrl} alt="Preview" className="mx-auto h-32 object-contain rounded" />
                                            <p className="text-xs text-primary-400">Click or Drag to replace image</p>
                                        </div>
                                    ) : (
                                        <div className="py-2">
                                            <QrCode size={32} className="mx-auto text-gray-600 mb-2 group-hover:text-primary-500 transition-colors" />
                                            <p className="text-sm text-gray-500">Upload QR Image</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary-600/20"
                                >
                                    {uploading ? 'Uploading...' : editingId ? 'Update Method' : 'Save Method'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
