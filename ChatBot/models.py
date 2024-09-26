from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Cliente(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome_completo = db.Column(db.String(100), nullable=False)
    cpf_cnpj = db.Column(db.String(20), nullable=False, unique=True)
    email = db.Column(db.String(100), nullable=False, unique=True)
    numero_celular = db.Column(db.String(20), nullable=False)
    senha = db.Column(db.String(100), nullable=True)
    codigo_confirmacao = db.Column(db.String(6), nullable=True)

    def __repr__(self):
        return f'<Cliente {self.nome_completo}>'